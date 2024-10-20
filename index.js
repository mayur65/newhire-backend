
// Importing necessary packages
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const singleStoreDB = require('./SingleStoreDB'); // Use require for the initialized instance
const GroqClient = require('./GroqClient'); // Use require instead of import
const ChromaEmbeddingService = require('./ChromaEmbeddingService')

const app = express();
app.use(bodyParser.json());
app.use(cors());

const groqClient = new GroqClient(process.env.GROQ_API_KEY);

function zeroUUIDv4() {
    return '00000000-0000-0000-0000-000000000000';
}

app.post('/questions', async (req, res) => {
    const { name, role, company, jobDescription, linkedinProfile, githubProfile, questions } = req.body;

    if (!name || !role || !company || !jobDescription || !linkedinProfile || !githubProfile) {
        return res.status(400).json({ message: 'Invalid input, all fields (name, role, company, jobDescription, questions) are required.' });
    }

    const questionsValue = questions.join(", ");

    const key = uuidv4();
    const collectionName = `${company}_${role}`.toLowerCase().replace(/\s+/g, '_');
    try {
        await singleStoreDB.createInterview({
            data: {
                id: key,
                name: name,
                role: role,
                company: company,
                linkedin_profile: linkedinProfile,
                github_profile: githubProfile,
                job_description: jobDescription,
                questions: questionsValue,  // Storing the questions as a single string
                collection_name: collectionName
            }
        });

        res.status(201).json({ message: 'Data inserted successfully', id: key });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error inserting data' });
    }
});

// Stores the interview and transcript
app.post('/interviewRecord', async (req, res) => {
    const { uid, interviewRecord, expressions } = req.body;
    console.log(uid)
    console.log(interviewRecord)
    console.log(expressions)

    // Check if interviewRecord is provided
    if (!uid || !interviewRecord || !expressions || !Array.isArray(interviewRecord) || interviewRecord.length === 0) {
        return res.status(400).json({ message: 'Invalid input, interviewRecord is required and should be a non-empty array.' });
    }
    console.log("saving interview")
    try {
        // Store the interview record into the database
        await singleStoreDB.updateData({
            data: {
                uid: uid, // Unique identifier for the interview
                interview_record: JSON.stringify(interviewRecord), // Store the interviewRecord as JSON
                expressions: JSON.stringify(expressions)
            }
        });

        res.status(201).json({ message: 'Interview record inserted successfully', uid: uid });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error inserting interview record' });
    }
});

app.get('/all', async(req,res) => {
    try {
        const response = await singleStoreDB.getAll();
        if (response) {
            res.json(response);
        } else {
            res.status(404).send('Interview record not found');
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error fetching question');
    }
})

app.get('/questions/:uid', async (req, res) => {
    try {
        const question = await singleStoreDB.readOne({ id: req.params.uid });
        if (question) {
            res.json(question);
        } else {
            res.status(404).send('Interview record not found');
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error fetching question');
    }
});

app.get('/interviewRecords/:uid', async (req, res) => {
    try {
        const question = await singleStoreDB.readOneRecord({ id: req.params.uid });
        if (question) {
            res.json(question);
        } else {
            res.status(404).send('Question not found');
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error fetching question');
    }
});

app.post('/api/generate-description', async (req, res) => {
    const { jobDescription, company, role } = req.body;

    if (!jobDescription) {
        return res.status(400).json({ message: 'Job description is required' });
    }

    try {
        const profile = await groqClient.generateCandidateProfile(jobDescription, company, role);

        if (!profile) {
            return res.status(500).json({ message: 'Failed to generate description' });
        }

        const collectionName = `${company}_${role}`.toLowerCase().replace(/\s+/g, '_');
        const result = await chromaEmbeddingService.runEmbeddingProcess([profile], collectionName, zeroUUIDv4());

        res.status(200).json({ description: profile, embeddingResult: result });

    } catch (error) {
        console.error("Error generating description:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/generate-insights', async (req, res) => {
    const { uid } = req.body
    if (! await readOne({ uid })) {
        res.status(500).json({
            message: "UID does not exist"
        })
    } else {
        const { job_description } = await singleStoreDB.readOne({ uid })
        const { transcript } = await singleStoreDB.readOneRecord({ uid })

        console.log(uid)
        console.log(transcript)
        console.log(job_description)
    }
    
})



// CHROMA

const chromaEmbeddingService = new ChromaEmbeddingService(process.env.GOOGLE_API_KEY);

app.post("/generate-embeddings", async (req, res) => {
    try {
        const { id, document } = req.body; // Extract document and collectionName from the request body

        if (!document || !id) {
            return res.status(400).send({ error: "Document and collectionName are required" });
        }

        const data = await singleStoreDB.readOne({ id });

        if (!data || !data.company || !data.role) {
            return res.status(404).send({ error: "No matching record found for the given ID" });
        }

        const { company, role } = data;

        const documentParts = document.split(/\n+/);

        const collectionName = `${company}_${role}`.toLowerCase().replace(/\s+/g, '_');
        const queryResult = await chromaEmbeddingService.runEmbeddingProcess(documentParts, collectionName, id);

        res.status(200).send({ message: "Embeddings generated and stored successfully", result: queryResult });
    } catch (error) {
        res.status(500).send({ error: "An error occurred while generating embeddings" });
    }
});

app.post('/closest-embeddings', async (req, res) => {
    try {
        const { texts, collectionName } = req.body;

        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({ error: 'Please provide a valid list of texts.' });
        }

        if (!collectionName) {
            return res.status(400).json({ error: 'Please provide a collection name.' });
        }

        const closestDocuments = await chromaEmbeddingService.findClosestDocuments(texts, collectionName);
        res.json({ closestDocuments });
    } catch (error) {
        console.error('Error finding closest embeddings:', error);
        res.status(500).json({ error: 'An error occurred while finding the closest embeddings.' });
    }
});

app.post('/closest-embeddings-to-ideal', async (req, res) => {
    try {
        const { collectionName } = req.body;

        if (!collectionName) {
            return res.status(400).json({ error: 'Please provide a collection name.' });
        }

        const closestDocuments = await chromaEmbeddingService.findClosestToIdeal(collectionName);

        const documentIds = closestDocuments.map(doc => doc.id);

        const fullDocuments = [];
        for (const id of documentIds) {
            const documentData = await singleStoreDB.readOne({ id });
            if (documentData) {
                fullDocuments.push({
                    id: documentData.id,
                    name: documentData.name,
                    company: documentData.company,
                    role: documentData.role,
                    linkedin_profile: documentData.linkedin_profile,
                    github_profile: documentData.github_profile,
                    interview_feedback: documentData.interview_feedback
                });
            }
        }
        res.json({ documents: fullDocuments });
    } catch (error) {
        console.error('Error finding closest embeddings:', error);
        res.status(500).json({ error: 'An error occurred while finding the closest embeddings.' });
    }
});



// Start the server
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Bind to all available network interfaces
app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});
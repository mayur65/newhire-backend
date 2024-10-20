
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

app.post('/interviewRecord', async (req, res) => {
    const { id, interviewRecord } = req.body;

    // Check if interviewRecord is provided
    if (!id || !interviewRecord || !Array.isArray(interviewRecord) || interviewRecord.length === 0) {
        return res.status(400).json({ message: 'Invalid input, interviewRecord is required and should be a non-empty array.' });
    }

    try {
        // Store the interview record into the database
        await singleStoreDB.createInterviewRecord({
            data: {
                id: id, // Unique identifier for the interview
                interview_record: JSON.stringify(interviewRecord) // Store the interviewRecord as JSON
            }
        });

        res.status(201).json({ message: 'Interview record inserted successfully', id: key });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error inserting interview record' });
    }
});

app.get('/questions/:id', async (req, res) => {
    try {
        const question = await singleStoreDB.readOne({ id: req.params.id });
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


app.get('/interviewRecords/:id', async (req, res) => {
    try {
        const question = await singleStoreDB.readOneRecord({ id: req.params.id });
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

const groqClient = new GroqClient(process.env.GROQ_API_KEY);

app.post('/api/generate-description', async (req, res) => {
    const { jobDescription, company } = req.body;

    if (!jobDescription) {
        return res.status(400).json({ message: 'Job description is required' });
    }

    try {
        const profile = await groqClient.generateCandidateProfile(jobDescription, company);

        if (!profile) {
            return res.status(500).json({ message: 'Failed to generate description' });
        }

        const collectionName = "000";
        const result = await chromaEmbeddingService.runEmbeddingProcess([profile], collectionName);

        res.status(200).json({ description: profile, embeddingResult: result });

    } catch (error) {
        console.error("Error generating description:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

const chromaEmbeddingService = new ChromaEmbeddingService(process.env.GOOGLE_API_KEY);

app.post("/generate-embeddings", async (req, res) => {
    try {
        const { document, collectionName } = req.body; // Extract document and collectionName from the request body

        if (!document || !collectionName) {
            return res.status(400).send({ error: "Document and collectionName are required" });
        }

        const documentParts = document.split(/\n+/); // Split by new lines as an example, adjust as needed
        const queryResult = await chromaEmbeddingService.runEmbeddingProcess(documentParts, collectionName);

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



// Start the server
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Bind to all available network interfaces
app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});
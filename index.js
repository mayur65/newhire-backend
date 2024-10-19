
// Importing necessary packages
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const singleStoreDB = require('./SingleStoreDB'); // Use require for the initialized instance

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post('/questions', async (req, res) => {
    const { name, role, company, jobDescription, questions } = req.body;

    if (!name || !role || !company || !jobDescription || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Invalid input, all fields (name, role, company, jobDescription, questions) are required.' });
    }

    const questionsValue = questions.join(", ");

    const key = uuidv4();
    try {
        await singleStoreDB.createInterview({
            data: {
                id: key,
                name: name,
                role: role,
                company: company,
                job_description: jobDescription,
                questions: questionsValue  // Storing the questions as a single string
            }
        });

        res.status(201).json({ message: 'Data inserted successfully', id: key });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error inserting data' });
    }
});

app.post('/interviewRecord', async (req, res) => {
    const { interviewRecord } = req.body;

    // Check if interviewRecord is provided
    if (!interviewRecord || !Array.isArray(interviewRecord) || interviewRecord.length === 0) {
        return res.status(400).json({ message: 'Invalid input, interviewRecord is required and should be a non-empty array.' });
    }

    const key = uuidv4(); // Generate a unique key (UUID)
    try {
        // Store the interview record into the database
        await singleStoreDB.createInterviewRecord({
            data: {
                id: key, // Unique identifier for the interview
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

// Start the server
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Bind to all available network interfaces
app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});
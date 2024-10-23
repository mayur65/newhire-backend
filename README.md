This repository contains the backend service developed for the Hire_New Application that my team build as part of Cal Hacks 2024.

The product that we worked on was designed to be AI-simulated interviews conducted from the perspective of employers. The employer would begin by filling out a short form providing relevant details of the interview like -
 1. Name of the candidate
 2. Job role
 3. Company
 4. Job Description
 5. Questions (if anything specific needs to be asked)
 6. Github profile
 7. LinkedIn profile

Once the form is submitted, the system sends back the AI interview link, which has to be sent to the candidate. The candidate takes the AI interview (Hume API integrated in the frontend), and the complete transcript of the interview is received in the backend.
With the transcript stored, the system ranks the candidate by storing the embeddings of the interview in chromadb (vectordb), and then ranking them based on cosine similarity. To have a benchmark for the candidates to find the similarity from, a description of an ideal candidate (using the job description) is generated via Groq service, using the Llama model.
With the embedding of the ideal candidate stored in the chromadb, the surrounding candidates are ranked and shown in a separate screen made for the recruiter.

As part of the backend service, the following important APIs were provided :

1. /saveRecord -> To save the initial interview details
2. /readRecord -> To read the record from the backend so as to provide relevant details to the Hume AI service conducting the interview.
3. /updateRecord -> To update the already saved record with the transcript of the interview.
4. /generate_embedding -> To generate embedding of a candidate interview based on the transcript provided.
5. /rank_embedding -> To provide a list of ranked candidates based on their cosine similarity with the ideal candidate
6. /generate_ideal_candidate -> To generate a description of the ideal candidate by using Groq service (Llama model) and then calling /generate_embedding to store the description in the vectordb.

Integrations done as part of the project :

1. SingleStore client -> To provide functions for interacting with the singlestore db. They were used for storing interview records.
2. Groq client -> Used for infering an ideal candidate's description based on the job description provide in a prompt.
3. Chromadb client -> Used for creating embeddings (using Google Gemini) and storing in the vectordb. The client also had a function to rank the candidates using the ideal candidate as a reference.

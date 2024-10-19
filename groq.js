import Groq from 'groq-sdk';


class GroqImpl {
    constructor(job_desc, transcript) {
        this.groq = new Groq({ apiKey: process.env.GROQ_KEY })
        this.job_desc = job_desc
        this.transcript = transcript
        this.shot_example = `
            "Full name": "name of the candidate",
            "Role": "name of the role the candidate is applying for",
            "Job description": "the description of the job the candidate is applying for",
            "Company": "name of the company",
            "Inclination to hire": "Evaluation of how well the candidate's experiences and responses aligns with the job description"
        `
    }

    async generateDecisionStructure() {
        const result = this.groq.chat.completions.create({
            messages: [
                {
                    "role": "system",
                    "content": "Write in JSON format:\n\n{\"Candidate full name\":\"Candidate full name goes here\",\"Role\":\"name of the role goes here\",\"Job description\":\"raw job description goes here\",\"Company\":\"Company name goes here\",\"Inclination to hire\":\"reason for hiring the candidate goes here\"}"
                },
                {
                    "role": "user",
                    "content": `### Transcript ${this.transcript}\n\n### Example\n\n${this.shot_example}### Instructions\n\nCreate a structure for determining a hiring decision based on the interview transcript. Quality over quantity.`
                }
            ],
            model: "llama-3.1-70b-versatile", 
            temperature: 0.3,
            max_tokens:8000,
            top_p:1,
            stream:False,
            response_format:{"type": "json_object"},
            stop:None,
          });
        return result;
    }

    async generateSection(section) {
        const decision = this.groq.chat.completion.create({
            model: "llama-3.1-8b-instant", //8b
            messages: [
                {
                    "role": "system",
                    "content": "You are an expert hiring manager. Generate a comprehensive hiring decision based factually on the transcript provided."
                },
                {
                    "role": "user",
                    "content": `### Transcript\n\n${this.transcript}\n\n### Instructions\n\nGenerate a comprehensive and detailed hiring decision based on the transcript: \n\n${section}`
                }
            ],
            temperature:0.3,
            max_tokens:8000,
            top_p:1,
            stream: false,
            stop:None,
        })
    }

    async generateDecision() {
        const notes_structure = generateDecisionStructure()
    }

}


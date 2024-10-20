const Groq = require("groq-sdk");

class GroqClient {
    constructor(apiKey) {
        this.groq = new Groq({ apiKey });
    }

    // Method to call chat completions with dynamic model and prompt
    async getChatCompletion(prompt, model = "llama3-8b-8192") {
        try {
            const response = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                model,  // Dynamic model selection (default is "llama3-8b-8192")
            });

            return response.choices[0]?.message?.content || "";
        } catch (error) {
            console.error("Error getting Groq chat completion:", error);
            return null;
        }
    }

    async generateCandidateProfile(jobDescription, model = "llama3-8b-8192") {
        const prompt = `
            Based on the following job description, generate a detailed profile of the ideal candidate.
            The profile should include the following sections:
            
            1. **Technical Skills**: The most important technical skills and tools the candidate should know.
            2. **Soft Skills**: Key interpersonal and communication skills the candidate should have.
            3. **Work Experience**: The relevant job titles, types of projects, and industries the ideal candidate should have worked in.
            4. **Personality Traits**: The key personality traits that would make the candidate successful in this role.
            5. **Cultural Fit**: Traits that align with the company's culture and values.
            
            Job Description: ${jobDescription}
        `;

        return this.getChatCompletion(prompt, model);
    }
}

module.exports = GroqClient;
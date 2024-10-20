const chroma = require("chromadb");
const { v4: uuidv4 } = require('uuid');
class ChromaEmbeddingService {
    constructor(apiKey, chromaUrl = "http://localhost:8000") {
        this.chromaClient = new chroma.ChromaClient({ path: chromaUrl });
        this.embedder = new chroma.GoogleGenerativeAiEmbeddingFunction({
            googleApiKey: apiKey,
        });
    }

    async resetDB() {
        await this.chromaClient.reset();
    }

    async createCollection(name) {
        return await this.chromaClient.createCollection({
            name: name,
            metadata: { "hnsw:space": "cosine" },
            embeddingFunction: this.embedder,
        });
    }

    async addDocuments(collection, ids, embeddings) {
        await collection.add({
            ids: ids,
            embeddings: embeddings,
        });
    }

    async queryCollection(collection, queryEmbeddings, nResults = 1) {
        return await collection.query({
            queryEmbeddings: queryEmbeddings,
            nResults: nResults,
        });
    }

    async listCollections() {
        return await this.chromaClient.listCollections();
    }

    async runEmbeddingProcess(texts, collectionName, id) {
        const existingCollections = await this.listCollections();
        const collectionExists = existingCollections.some(
            (col) => col.name === collectionName
        );

        let collection;
        if (collectionExists) {
            collection = await this.chromaClient.getCollection({
                name: collectionName,
                embeddingFunction: this.embedder,
            });
        } else {
            collection = await this.createCollection(collectionName);
        }

        const embeddings = await this.embedder.generate(texts);
        const aggregatedEmbeddings = this.averageEmbeddings(embeddings);

        const uuid = uuidv4();
        await this.addDocuments(collection, [id], aggregatedEmbeddings);

        return uuid;
    }

    async findClosestDocuments(texts, collectionName) {
        const existingCollections = await this.listCollections();
        const collectionExists = existingCollections.some(
            (col) => col.name === collectionName
        );

        if (!collectionExists) {
            throw new Error(`Collection with name ${collectionName} does not exist.`);
        }

        // Get the collection
        const collection = await this.chromaClient.getCollection({
            name: collectionName,
            embeddingFunction: this.embedder,
        });

        const embeddings = await this.embedder.generate(texts);
        const averagedEmbedding = this.averageEmbeddings(embeddings);

        const queryResult = await this.queryCollection(collection, averagedEmbedding, 2);

        return queryResult;
    }

    async findClosestToIdeal(collectionName) {
        const existingCollections = await this.listCollections();
        const collectionExists = existingCollections.some(
            (col) => col.name === collectionName
        );

        if (!collectionExists) {
            throw new Error(`Collection with name ${collectionName} does not exist.`);
        }

        const collection = await this.chromaClient.getCollection({
            name: collectionName,
            embeddingFunction: this.embedder,
        });

        const idealDocument = await collection.get({
            ids: ["00000000-0000-0000-0000-000000000000"],
        });

        if (!idealDocument || idealDocument.embeddings.length === 0) {
            throw new Error('Ideal document embedding not found.');
        }

        const idealEmbedding = idealDocument.embeddings[0];

        const queryResult = await this.queryCollection(collection, idealEmbedding, Number.MAX_SAFE_INTEGER)

        const sortedResults = queryResult.distances
            .map((distance, index) => ({
                id: queryResult.ids[index],
                document: queryResult.documents[index],
                distance: distance
            }))
            .sort((a, b) => a.distance - b.distance);

        return sortedResults;
    }



    averageEmbeddings(embeddings) {
        const length = embeddings.length;

        if (length === 0) return [];

        const embeddingLength = embeddings[0].length;

        let summedEmbedding = Array(embeddingLength).fill(0);

        const summedEmbeddings = embeddings.reduce((summedEmbedding, emb) => {
            return summedEmbedding.map((val, idx) => val + emb[idx]);
        }, summedEmbedding);

        return summedEmbeddings.map(val => (val / length));
    }

}

module.exports = ChromaEmbeddingService;

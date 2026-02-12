const request = require('supertest');
const app = require('../index');
const pool = require('../db');

jest.mock('../db', () => ({
    query: jest.fn(),
}));

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set environment variable to test to avoid starting real server
        process.env.NODE_ENV = 'test';
    });

    test('GET /posts should return all posts', async () => {
        const mockPosts = [{ id: 1, title: 'Test Post', body: 'Body', subreddit: 'test', upvotes: 0 }];
        pool.query.mockResolvedValueOnce({ rows: mockPosts });

        const res = await request(app).get('/posts');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockPosts);
        expect(pool.query).toHaveBeenCalledWith("SELECT * FROM posts ORDER BY created_at DESC");
    });

    test('POST /posts should create a new post', async () => {
        const newPost = { title: 'New', body: 'Content', subreddit: 'news' };
        const returnedPost = { id: 2, ...newPost, upvotes: 0 };
        pool.query.mockResolvedValueOnce({ rows: [returnedPost] });

        const res = await request(app).post('/posts').send(newPost);
        expect(res.statusCode).toEqual(201);
        expect(res.body).toEqual(returnedPost);
    });

    test('POST /subreddits should create a new subreddit', async () => {
        const newSub = { name: 'gaming' };
        const returnedSub = { id: 1, name: 'gaming' };
        pool.query.mockResolvedValueOnce({ rows: [returnedSub] });

        const res = await request(app).post('/subreddits').send(newSub);
        expect(res.statusCode).toEqual(201);
        expect(res.body).toEqual(returnedSub);
    });

    test('POST /subreddits should return 409 if already exists', async () => {
        const newSub = { name: 'gaming' };
        pool.query.mockResolvedValueOnce({ rows: [] }); // ON CONFLICT DO NOTHING returns 0 rows

        const res = await request(app).post('/subreddits').send(newSub);
        expect(res.statusCode).toEqual(409);
        expect(res.body).toEqual({ error: "Subreddit already exists" });
    });

    test('DELETE /posts/:id should delete a post', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1 });

        const res = await request(app).delete('/posts/1');
        expect(res.statusCode).toEqual(204);
    });

    test('PATCH /posts/:id/upvote should increment upvotes', async () => {
        const updatedPost = { id: 1, title: 'Test', upvotes: 1 };
        pool.query.mockResolvedValueOnce({ rows: [updatedPost] });

        const res = await request(app).patch('/posts/1/upvote');
        expect(res.statusCode).toEqual(200);
        expect(res.body.upvotes).toEqual(1);
    });

    test('GET /posts/r/:subreddit should filter posts', async () => {
        const mockPosts = [{ id: 1, title: 'Sub Post', subreddit: 'tech' }];
        pool.query.mockResolvedValueOnce({ rows: mockPosts });

        const res = await request(app).get('/posts/r/tech');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockPosts);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("WHERE subreddit = $1"), ['tech']);
    });
});

import httpClient from './httpClient';

export const Home = async (email, password) => {
    const response = await httpClient.post('/api/home', { email, password });
    return response.data;
}
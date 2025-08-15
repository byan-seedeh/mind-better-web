import httpClient from './httpClient';

export const login = async (email, password) => {
    const response = await httpClient.post('/api/login', { email, password });
    return response.data;
}
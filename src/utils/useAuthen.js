import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const useAuthen = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            setAuthenticated(JSON.parse(user));
            setIsLoading(false);
        } else {
            router.push('/login');
        }
    }, []);

    return { isLoading, authenticated };
}   
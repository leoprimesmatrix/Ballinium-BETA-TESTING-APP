import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Safe mounting function for browser environment
const mount = () => {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        // Recovery: If root is missing (e.g. wiped by previous run), recreate it
        const newRoot = document.createElement('div');
        newRoot.id = 'root';
        document.body.appendChild(newRoot);
        
        const root = ReactDOM.createRoot(newRoot);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
        return;
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
} else {
    mount();
}

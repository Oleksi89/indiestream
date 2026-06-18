import {Toaster} from 'react-hot-toast';

/**
 * Global notification toaster component.
 * Configured with dark theme styling matching the platform design tokens.
 */
export const AppToaster = () => {
    return (
        <Toaster
            position="bottom-right"
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#121212',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    padding: '12px 24px',
                    backdropFilter: 'blur(8px)',
                },
                success: {
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#121212',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#121212',
                    },
                },
            }}
        />
    );
};
export const GlobalThis = (() => {
    if (typeof window !== 'undefined') {
        return window;
    }

    if (typeof global !== 'undefined') {
        return global;
    }

    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }

    // eslint-disable-next-line no-restricted-globals
    if (typeof self !== 'undefined') {
        // eslint-disable-next-line no-restricted-globals
        return self;
    }

    return this;
})() as any;

import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sin `test.globals: true` en vitest.config.ts, Testing Library no detecta
// un framework de test global y no limpia el DOM solo — sin esto, los
// renders de un test quedan pegados en el document.body del siguiente test.
afterEach(cleanup);

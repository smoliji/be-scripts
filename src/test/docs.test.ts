import * as fs from 'fs';
import * as path from 'path';
import * as tempy from 'tempy';
import { promisify } from 'util';
import docs from '../lib/docs';

describe('Docs', () => {
    it('Simple .apib conversion', async() => {
        await docs(
            [],
            {
                input: [path.join(__dirname, 'docs.test-input.apib')],
                output: __dirname,
                tempDir: tempy.directory(),
            });
        const exists = await promisify(fs.exists)(path.join(__dirname, 'docs.test-input.html'));
        expect(exists).toBe(true);
        const content = await promisify(fs.readFile)(path.join(__dirname, 'docs.test-input.html'), 'utf8');
        expect(typeof content).toBe('string');
    });
});

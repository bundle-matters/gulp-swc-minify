import { describe, it, expect, beforeEach } from 'vitest';

import path from 'path';
import gulp from 'gulp';
import es from 'event-stream';
import File from 'vinyl';
import * as sourcemaps from 'gulp-sourcemaps';
import miss from 'mississippi';

import plugin from '../src';

const fixtures = function (glob) { return path.join(__dirname, 'fixtures', glob); }

describe('gulp-swc-minify', () => {
  describe('in buffer mode', () => {
    let fakeFile: File;
    beforeEach(() => {
      fakeFile = new File({
        contents: Buffer.from('class MyClass { constructor() { let asdf = 1; console.info(asdf); } }')
      });
    });

    it('should works', () => {
      // Create a prefixer plugin stream
      const myPrefixer = plugin();

      // write the fake file to it
      myPrefixer.write(fakeFile);

      // wait for the file to come back out
      myPrefixer.once('data', function (file) {
        // make sure it came out the same way it went in
        expect(file.isBuffer()).toBeTruthy();

        // check the contents
        expect(file.contents.toString('utf8')).toBe('class MyClass{constructor(){console.info(1)}}');
      });
    });

    it('should works with sourcemap', () => {
      fakeFile = new File({
        contents: es.readArray(['class MyClass { constructor() { let asdf = 1; console.info(asdf); } }'])
      });

      // Create a prefixer plugin stream
      const myPrefixer = plugin();

      // write the fake file to it
      myPrefixer.write(fakeFile);

      // wait for the file to come back out
      myPrefixer.once('data', function (file) {
        // make sure it came out the same way it went in
        expect(file.isBuffer()).toBeTruthy();

        // check the contents
        expect(file.contents.toString('utf8')).toBe('class MyClass{constructor(){console.info(1)}}');
      });

      function assert(results) {
        var data = results[0];
        expect(data.sourceMap).not.toBeUndefined();
        expect(data.contents.toString()).toEqual('class MyClass{constructor(){console.info(1)}}' + '\n//# sourceMappingURL=' + base64JSON(data.sourceMap) + '\n');
      }
  
      miss.pipe([
        fakeFile.contents,
        sourcemaps.init(),
        plugin(),
        sourcemaps.write(),
        miss.concat(assert),
      ]);
    });
  });
});

function base64JSON(obj: object) {
  return 'data:application/json;charset=utf8;base64,' + Buffer.from(JSON.stringify(obj)).toString('base64');
}
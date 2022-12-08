import { describe, it, expect } from 'vitest';
import ObjectStream, { Transform } from 'o-stream';
import sourcemaps from 'gulp-sourcemaps';
import File from 'vinyl';

import plugin from '../src';

const FILE_PATH = 'bundle.js';
const FILE_MIN_PATH = 'bundle.min.js';
const FILE_TEXT = 'class MyClass { constructor() { let asdf = 1; console.info(asdf); } }';
const FILE_TEXT_UGLIFIED = 'class MyClass{constructor(){console.info(1)}}';

describe('should ok', () => {
  it('When recieves a valid file, then uglify it.', async () => {
    let stream = plugin();
    let file = createGulpTextFile(FILE_TEXT);

    stream.write(file);
    let actual = (await stream[Symbol.asyncIterator]().next()).value;

    expect(stream.read()).toBeNull();
    expect(actual.contents.toString()).toEqual(FILE_TEXT_UGLIFIED);
  });

  it('When recieves a file without contents, then pass through.', () => {
    let stream = plugin();
    let file = new File({ path: FILE_PATH, contents: null });

    stream.write(file);
    let actual = stream.read();

    expect(stream.read()).toBeNull();
    expect(actual).toEqual(file);
  });

})

describe('When created with source-map', () => {
  it('Test source maps are created in external file.', async () => {
    let inStream = ObjectStream.transform({});

    let outStream = inStream
      .pipe(sourcemaps.init())
      .pipe(plugin())
      .pipe(sourcemaps.write('./maps'));

    let file = createGulpTextFile(FILE_TEXT);

    inStream.write(file);
    await delayForUglifyToFinish();

    let mapFile = outStream.read() as any;
    let actual = outStream.read() as any;

    const sourceMapString = '\n//# sourceMappingURL=maps/bundle.min.js.map\n';
    expect(outStream.read()).toBeNull();
    expect(actual.contents.toString()).toEqual(FILE_TEXT_UGLIFIED + sourceMapString);

    let map = JSON.parse(mapFile.contents.toString());
    // console.log(map);
    expect(map.sources[0]).toEqual(FILE_MIN_PATH);
    expect(map.mappings.length).toBeGreaterThan(0);
    expect(map.file).toEqual('../' + FILE_MIN_PATH);
    expect(map.sourcesContent[0]).toEqual(FILE_TEXT);
  });

  it('Test source maps are created inline.', async () => {
    let inStream = ObjectStream.transform({});

    let outStream = inStream
      .pipe(sourcemaps.init())
      .pipe(plugin())
      .pipe(sourcemaps.write()) as Transform;

    let file = createGulpTextFile(FILE_TEXT);

    inStream.write(file);
    await delayForUglifyToFinish();
    let actual: File = outStream.read();

    const sourceMapString = '\n//# sourceMappingURL=data:application/json;charset=utf8;base64';
    expect(outStream.read()).toBeNull();
    expect(actual.contents!.toString().startsWith(FILE_TEXT_UGLIFIED + sourceMapString)).to.true;
  });
});

function createGulpTextFile(text: string): File {
  return new File({
    path: FILE_MIN_PATH,
    contents: Buffer.from(text)
  });
}

async function delayForUglifyToFinish(): Promise<void> {
  for (let i = 0; i < 3; i++)
    await new Promise((resolve) => setTimeout(resolve, 1));
}

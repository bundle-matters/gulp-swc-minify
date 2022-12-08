// through2 is a thin wrapper around node transform streams
import through from 'through2';
import PluginError from 'plugin-error';
import * as File from 'vinyl';
import * as swc from '@swc/core'
import applySourceMap from 'vinyl-sourcemaps-apply';

// Consts
const PLUGIN_NAME = 'gulp-swc-minify';

// Plugin level function(dealing with files)
export default function plugin(swcMinifyOptions: swc.JsMinifyOptions = {}) {
  // Creating a stream through which each file will pass
  return through.obj(async function(file: File, enc: BufferEncoding, cb) {
    if (file.isStream()) {
      throw new PluginError(PLUGIN_NAME, 'Do not support streams.');
    }

    if (file.isNull() || !file.contents) {
      // return empty file
      return cb(null, file);
    }

    if (file.isBuffer()) {

      if (file.sourceMap) {
				swcMinifyOptions.sourceMap = true;
			}

      try {
        const sourcesContent = file.contents.toString();
        let result = await swc.minify(file.contents.toString(), swcMinifyOptions);
        file.contents = Buffer.from(result.code);
  
        if (file.map && result.map) {
          const sourcemap = generateSourceMap(result.map);
          applySourceMap(file, JSON.stringify(sourcemap));
        }
  
        function generateSourceMap(mapStr: string) {
          const map = JSON.parse(mapStr);
          // make swc sourcemap to work with vinyl sourcemap
          // vinyl-sourcemaps-apply/index.js:15
          map.file = file.relative;
          map.sources = [file.relative];
          map.sourcesContent = [sourcesContent];
          return map;
        }
      } catch (error) {
        throw new PluginError(PLUGIN_NAME, error as Error);
      }
    }

    cb(null, file);

  });
}

// gulp terser sourcemap format sample
// {
// 	version: 3,
// 	file: "bundle.min.js",
// 	names: [
// 		"MyClass",
// 		"constructor",
// 		"console",
// 		"info",
// 	],
// 	sources: [
// 		"bundle.min.js",
// 	],
// 	sourcesContent: [
// 		"class MyClass { constructor() { let asdf = 1; console.info(asdf); } }",
// 	],
// 	mappings: "AAAA,MAAMA,QAAUC,cAA8BC,QAAQC,KAAX,EAAuB",
// }

import PluginError from 'plugin-error';
import * as File from 'vinyl';
import * as swc from '@swc/core';
import ObjectStream, { EnteredArgs } from 'o-stream';

const applySourceMap = require('vinyl-sourcemaps-apply');

// Consts
const PLUGIN_NAME = 'gulp-swc-minify';

// Plugin level function(dealing with files)
export default function plugin(swcMinifyOptions: swc.JsMinifyOptions = {}) {
  return ObjectStream.transform({
    onEntered: (args: EnteredArgs<File, File>) => {
      const file = args.object;
      if (file.isStream()) {
        throw new PluginError(PLUGIN_NAME, 'Do not support streams.');
      }

      if (file.isNull() || !file.contents) {
				args.output.push(file);
				return;
			}

      if (file.isBuffer()) {
  
        if (file.sourceMap) {
          swcMinifyOptions.sourceMap = true;
        }
  
        try {
          const sourcesContent = file.contents.toString();
          let result = swc.minifySync(file.contents.toString(), swcMinifyOptions);
          file.contents = Buffer.from(result.code);
    
          if (file.sourceMap && result.map) {
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

          args.output.push(file);
        } catch (error) {
          throw new PluginError(PLUGIN_NAME, error as Error);
        }
      }
    },
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

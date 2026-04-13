// source.config.ts
import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema
} from "fumadocs-mdx/config";
import { createGenerator, remarkAutoTypeTable } from "fumadocs-typescript";
var generator = createGenerator();
var docs = defineDocs({
  docs: {
    schema: frontmatterSchema
  },
  meta: {
    schema: metaSchema
  }
});
var source_config_default = defineConfig({
  mdxOptions: {
    // MDX options
    remarkPlugins: [[remarkAutoTypeTable, { generator }]]
  }
});
export {
  source_config_default as default,
  docs
};

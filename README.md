# lima(1)

**li**terate **ma**rkdown.

lima is a tool for generating computer programs from
[Markdown](https://daringfireball.net/projects/markdown/) documents that
describe them. it's inspired by [Knuth](https://cs.stanford.edu/~knuth/)'s
concept of [Literate
Programming](https://en.wikipedia.org/wiki/Literate_programming).

this version is written in [typescript](https://www.typescriptlang.org/).

<small><sub>the tangled code is viewable on-line at
[lima-tangled](https://git.sr.ht/~chee/lima-tangled).</sub></small>

## intro

the syntax is inspired by the beautiful <!-- and complex -->
[`org-mode-babel`](https://orgmode.org/worg/org-contrib/babel/intro.html).

### terminology

- **_weave_/_woven_** :: the documentation generated for viewing by a person is
  said to weave both prose and code. for example, a web page or pdf.
- **_tangle_/_tangled_** :: the code extracted from the source document into a
  form for execution or compilation by a computer is said to be "tangled" for
  some reason.
- **_metaline_** :: a line of comma/space separated key=value pairs for
  providing instructions to `lima` on how a block of code should be tangled

### metaline opts

| option   | type   | info                                                   |
|----------|--------|--------------------------------------------------------|
| filename | string | required for the block to be tangled, but optional     |
| #!       | string | shebang to add at top of file. sets the executable bit |

strings are added like `option="value"`. bools can be `option=yes` or
`option=no`. `shebang` is available as an alias for `#!`.

#### implementation

see [metaline processor](#metaline-processor) for the implementation details.

### weave

lima markdown files are valid commonmark, any markdown renderer that support
fenced code blocks should be able to be used to weave the code.

however, the `tangle` command has been left as a subcommand so that a future
`weave` command could be added if it ever seems like a good idea.


### installing

#### from npm

```sh
$ npm install -g @chee/lima
```

#### from source

```sh
$ lima tangle README.md
$ npm install
$ npm run build
$ npm install -g .
```

### command line usage

```shell
$ lima tangle file.md
```

see [interface](#interface) for implementation info.

## metaline processor

if we have a markdown file like this:

````markdown
# welcome to my file

hello i am a markdown file

```ruby filename="hello_world.rb", #!="/usr/bin/env ruby"
puts "hello world"
```
````

the metaline would be the part that looks like this:

> `filename="hello_world.rb", #!="/usr/bin/env ruby".`

(that example would set the output filename to `hello_world.rb`, set the first line
of the file to `"#!/usr/bin/env ruby"` and activate the executable bit :))

### metaline types

parsing returns a `Metaline`.

`Metaline` is a map of `string` keys to `bool` or string`` values.

```typescript filename="src/lib/metaline-parser.ts"
type Metaline = {[property: string]: boolean|string}
```

### states

metaline isn't so complicated! there are only 4 states for the machine.

```typescript filename="src/lib/metaline-parser.ts"
enum MetalineParserState {
  begin,
  property,
  value,
  end
}
```

### i want to be a Meta Machine

let's begin at the beginning.

```typescript filename="src/lib/metaline-parser.ts"
export default class MetalineParser {
  state: MetalineParserState = MetalineParserState.begin
  source = ""
  property = ""
```

we're going to return a `Metaline`. we rely on the [`CodeNodeProcessor`](#code-node-processor) to pull out
the string and pass it to us.

```typescript filename="src/lib/metaline-parser.ts"
  result: Metaline = {}
  parse(source: string): Metaline {
```

reset these in case we are re-used.

```typescript filename="src/lib/metaline-parser.ts"
    this.state = MetalineParserState.begin
    this.result = {}
    this.property = ""
```

set the source to the incoming string

```typescript filename="src/lib/metaline-parser.ts"
    this.source = source
    while (this.source.length) {
```

go on until we come to the end, then stop :]

```typescript filename="src/lib/metaline-parser.ts"
      this.next()
    }
    return this.result
  }
```

#### parsing

let's get to parsing.

```typescript filename="src/lib/metaline-parser.ts"
  next() {
    switch (this.state) {
```

when we are in the `begin` state we expect to see some whitespace. after that we
expect to see the beginning of an identifier. the only illegal chars for
starting an identifier are `=`, `"` and `,`. those are meaningful to the parser
so we outlaw them here.

##### .begin

```typescript filename="src/lib/metaline-parser.ts"
      case MetalineParserState.begin: {
        this.source = this.source.replace(/^\s+/, "")
        let f = this.source[0]
        if (f == "=" || f == '"' || f == ",") {
```

it would be preferable not to throw here, and instead maintain a list of
problems to print to stderr at the end. something to work on later!

```typescript filename="src/lib/metaline-parser.ts"
          throw new Error(`invalid char at 0: ${f}`)
        } else {
```

once we've walked past all that space, we enter the `property` creating state.

```typescript filename="src/lib/metaline-parser.ts"
          this.state = MetalineParserState.property
        }
        break;
      }
```

##### .property

```typescript filename="src/lib/metaline-parser.ts"
      case MetalineParserState.property: {
```

a key, value pair in the metaline looks like `key=value`. if we don't see
something that looks like that, that's an error!

```typescript filename="src/lib/metaline-parser.ts"
        let match = this.source.match(/^[^=]+/)
        if (!match) {
          throw new Error("i don't know")
        }
```

provided we found something, we set the `this.property` state to the match,
which we can use once we've found out what the value is

```typescript filename="src/lib/metaline-parser.ts"
        this.property = match[0]
```

we trim the property name off the source string. we remove 1 extra char for the
`=`, and set the new state to .value

```typescript filename="src/lib/metaline-parser.ts"
        this.source = this.source.slice(this.property.length + 1)
        this.state = MetalineParserState.value
        break
      }
```

##### .value

value gets a lil fancy

```typescript filename="src/lib/metaline-parser.ts"
      case MetalineParserState.value: {
        if (this.source[0] == '"') {
```

###### string values

we collect anything from a quote to the next quote. you can place a literal quote
in a value by escaping it like `\"`.

```typescript filename="src/lib/metaline-parser.ts"
          let string = this.source.match(/^"((?:\\"|[^"])*)/)
          if (!string) {
            throw new Error("couldn't find closing quote")
          }
```

once we've resolved a whole value we can set the property on the `Metaline`
result object to the value we've parsed and [continue](#next-state).

```typescript filename="src/lib/metaline-parser.ts"
          let value = string[1]
          this.result[this.property] = value
          this.source = this.source.slice(2 + value.length)
```

###### bools

we allow the unquoted values `yes`, `no`, `true` or `false` to set a boolean
value.

```typescript filename="src/lib/metaline-parser.ts"
        } else if (this.source.match(/^false\b/)) {
          this.result[this.property] = false
          this.source = this.source.slice(5)
        } else if (this.source.match(/^true\b/)) {
          this.result[this.property] = true
          this.source = this.source.slice(4)
        } else if (this.source.match(/^yes\b/)) {
          this.result[this.property] = true
          this.source = this.source.slice(3)
        } else if (this.source.match(/^no\b/)) {
          this.result[this.property] = false
          this.source = this.source.slice(2)
```

###### error

if it doesn't look like a string or a bool, it's invalid

```typescript filename="src/lib/metaline-parser.ts"
        } else {
          throw new Error(`bad value for ${this.property}`)
        }
```

###### next state

if there is a comma then we know the author wants to add another
property. otherwise we know the parsing is complete and we end parsing.

```typescript filename="src/lib/metaline-parser.ts"
        let commaetc = this.source.match(/^,\s*/)
        if (commaetc) {
          this.state = MetalineParserState.property
          this.source = this.source.slice(commaetc[0].length)
        } else if (this.source.match(/\s*$/)) {
          this.state = MetalineParserState.end
          this.source = ""
        }
      }
    }
  }
}
```

## code node processor

the code node processor expects a [unifiedjs](https://unifiedjs.com/) [mdast syntax
tree](https://github.com/syntax-tree/mdast) code node.

```typescript filename="src/lib/code-node-processor.ts"
import type {Code} from "mdast"
```

it's nice to let the user pass a path like `"~/.npmrc"` and resolve it to their
home directory. though maybe i'll remove this feature, because it was initially
added when i imagined lima being used for system-wide literate dotfiles (docfiles).

```typescript filename="src/lib/code-node-processor.ts"
import {createWriteStream, promises as fs} from "node:fs"
import path from "node:path"
import expandTilde from "untildify"
import MetalineParser from "./metaline-parser.js"
```

```typescript filename="src/lib/code-node-processor.ts"
export default class CodeNodeProcessor {
  seen: Set<string> = new Set
  parser = new MetalineParser()
```

### process

```typescript filename="src/lib/code-node-processor.ts"
  async process(code: Code) {
```

if there is no metaline, we should leave because this code block has nothing to
do with us.

```typescript filename="src/lib/code-node-processor.ts"
    if (!code.meta) {
      // i only tangle with meta
      return
    }
```

otherwise, parse the metaline using the [metaline parser](#metaline-parser)

```typescript filename="src/lib/code-node-processor.ts"
    let meta = this.parser.parse(code.meta)
```

#### metaline with filename

if the metaline has a filename, then the fun really begins.

multiple blocks can reference the same filename. we check if we've seen it
before so we can open the file in append mode if we have. we add it to the
`this.seen` registry so we know the same next time.

```typescript filename="src/lib/code-node-processor.ts"
    if (typeof meta.filename == "string") {
      let fn = expandTilde(meta.filename)
      let seen = this.seen.has(fn)
      this.seen.add(fn)
      let shebang = meta.shebang || meta["#!"]
		// TODO make this real, and work with pairs
		let comment = meta.filename.endsWith(".ts") ? "//" : null
```

if the file is in a directory, then we should make that directory!!

```typescript filename="src/lib/code-node-processor.ts"
      if (path.basename(fn) != fn) {
			await fs.mkdir(path.dirname(fn), {recursive: true})
      }
```

now that we know what we're doing with the file, let's create a write stream for
it. if there is a shebang, we set the executable bit. in this case `mode` has to
be a number,

```typescript filename="src/lib/code-node-processor.ts"
      let stream = createWriteStream(fn, {
        encoding: "utf-8",
        flags: seen ? "a" : "w",
        mode: shebang
          ? 0o755
          : undefined
      })

```

if there is a shebang, and it's the first time we ever saw this block, we output
the shebang. we have no backtracking here, so we can't do anything if someone
adds a shebang to a later block but we emit a warning. i'm streamin' here.

```typescript filename="src/lib/code-node-processor.ts"
let start = code.position?.start?.line || ""
let end = code.position?.end?.line || ""
comment && stream.write(comment + " START " + start + "\n")

if (shebang && !seen) {
    stream.write("#!" + shebang + "\n")
} else if (shebang) {
    process.stderr.write(`warning: ignoring shebang on already-seen file\n`)
    process.stderr.write(`(only the first reference to a file should set a shebang)\n`)
}

stream.write(code.value + "\n")
comment && stream.write(comment + " END " + end + "\n")
stream.close()

return new Promise(yay => {
    stream.on("close", yay)
})
} else if ("filename" in meta) {
    throw new TypeError(`filename must be a string, got ${meta.filename}`)
}
}

}
```

## interface

i think i mentioned before that code node processor operates on an mdast
codeblock

```typescript filename="./src/lima.ts"
import {unified} from "unified"
import type {CompilerFunction} from "unified"
import {stream} from "unified-stream"
import remarkParse from "remark-parse"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import type {Code} from "mdast"
import {createReadStream, existsSync} from "fs"
import CodeNodeProcessor from "./lib/code-node-processor.js"
```

### usage printer

```typescript filename="./src/lima.ts"
export function usage(error: Error) {
  process.stderr.write(error.message + "\n")
  process.stdout.write("lima tangle <file>\n")
  process.exit(2)
}
```

```typescript filename="./src/lima.ts"
function getStream(path?: string) {
  if (path) {
    if (existsSync(path)) {
      return createReadStream(path)
    } else {
      throw new Error(`no such file ${path}`)
    }
  } else {
		return process.stdin
  }
}
```

### unist tangle

we create a `CodeNodeProcessor`, and then we recursively walk the document
looking for code nodes, and if we find a code node then we invite the
`CodeNodeProcessor` to take a look.

```typescript filename="./src/lima.ts"
function tangle(this: typeof tangle) {
    let code = new CodeNodeProcessor
    Object.assign(this, {Compiler: walk})
    async function walk(node: any) {
	if (node.type == "code") {
	    await code.process(node as Code)
	} else if ("children" in node && Array.isArray(node.children)) {
	    for (let child of node.children) {
		await walk(child)
	    }
	}
    }
}
```

### cli

this function is used as the entry-point.

```typescript filename="./src/lima.ts"
export function cli(args: string[]) {
  let [command, filename] = args
```

`lima(1)` expects a sub-command of `tangle` in case there's ever a need or
desire to add a lima-specific weaving function.

```typescript filename="./src/lima.ts"
  if (command != "tangle") {
    throw new Error("only tangling is supported")
  }

  let input = getStream(filename)

  input.pipe(stream(
	 unified()
		 .use(remarkParse)
		 .use(remarkFrontmatter)
		 .use(remarkGfm)
		 .use(tangle)
  ))
}
```


### entry point

the entry-point is a tiny wrapper around the .cli function [exported by
lima](#cli).

we mention `dist` here and not `src` because that's what the path will be after
typescript compilation.

```javascript filename="bin/lima.js", #!="/usr/bin/env node"
import {cli, usage} from "../dist/lima.js"
try {
	cli(process.argv.slice(2))
} catch(error) {
	usage(error)
}
```

## package info

```json filename="package.json"
{
  "name": "@chee/lima",
  "version": "2.1.1",
  "description": "literate programming with markdown",
  "type": "module",
  "bin": {
    "lima": "bin/lima.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w"
  },
  "author": "chee <chee@snoot.club>",
  "license": "GPL-3.0+",
  "devDependencies": {
    "@types/node": "^14.14.20",
    "typescript": "^4.7.4"
  },
  "dependencies": {
	 "make-dir": "^2.1.0",
	 "mdast-util-from-markdown": "^0.8.4",
	 "remark-frontmatter": "^4.0.1",
	 "remark-gfm": "^3.0.1",
	 "remark-parse": "^10.0.1",
	 "unified": "^10.1.2",
    "unified-stream": "^2.0.0",
	 "untildify": "^4.0.0"
  },
  "volta": {
	 "node": "18.7.0"
  }
}
```

## typescript config

```json filename="tsconfig.json"
{
  "include": ["src/**/*"],
  "exclude": ["test/**"],
  "compilerOptions": {
    "lib": ["es2022"],
	 "strict": true,
	 "allowSyntheticDefaultImports": true,
	 "skipLibCheck": true,
	 "moduleResolution": "node",
    "outDir": "dist",
	 "module": "es2022"
  }
}
```

## publish script

```fish #!="/usr/bin/env fish", filename="scripts/publish.fish"
lima tangle README.md
and npm run build
and ./bin/lima.js tangle README.md
and npm run build
and ./bin/lima.js tangle README.md
and rm .gitignore
and npm publish
echo '*' > .gitignore
```

# lima(1)

**li**terate **ma**rkdown.

lima is a tool for generating computer programs from
[Markdown](https://daringfireball.net/projects/markdown/) documents that
describe them. it's an implementation of
[Knuth](https://cs.stanford.edu/~knuth/)'s concept of [Literate
Programming](https://en.wikipedia.org/wiki/Literate_programming).

this version is written in [typescript](https://www.typescriptlang.org/).

## intro

the syntax is inspired by the beautiful <!-- and complex -->
[`org-mode-babel`](https://orgmode.org/worg/org-contrib/babel/intro.html).

### terminology

- **_weave_/_woven_** :: the documentation generated for viewing by a person is
  said to weave both prose and code. for example, a web page or pdf.
- ***tangle_/_tangled*** :: the code extracted from the source document into a
  form for execution or compilation by a computer is said to be "tangled" for
  some reason.
- **_web_/_noweb_** ::
  [web](https://www-cs-faculty.stanford.edu/~knuth/cweb.html) is the original
  literate programming tool by
  knuth. [noweb](https://www.cs.tufts.edu/~nr/noweb/) is another lovely
  implementation of the concept.
- **_metaline_** :: a line of comma/space separated key=value pairs for
  providing instructions to lima on how a block of code should be tangled

### metaline

the **metaline** is a list of options for a codeblock that provides instructions
to `lima` on how the block should be tangled.


#### valid options

| option   | type   | info                                                   |
|----------|--------|--------------------------------------------------------|
| filename | string | required for the block to be tangled, but optional     |
| name     | string | a name for this codeblock                              |
| #!       | string | shebang to add at top of file. sets the executable bit |
| expand   | bool   | expand noweb-style templates                           |


strings are added like `option="value"`. bools can be `option=yes` or
`option=no`. `shebang` is available as an alias for `#!`.

#### implementation

see [metaline processor](#metaline-processor) for the implementation details.

### noweb

you can perform very basic replacements with a syntax inspired by
[noweb](https://www.cs.tufts.edu/~nr/noweb/).

if the metaline for your codeblock contains a `name` (rather than a `filename`),
you can refer to it in a later codeblock (like `<<name>>`) and have it expanded
to the contents of the codeblock.

to enable this, set `expand` to `true` in the metaline of the referencing block.

have a look in
[./test/integration-tests/noweb](./test/integration-tests/noweb/) for an
example. see [CodeNodeProcessor](#tmpl) for the implementation details.

### weave

lima markdown files are valid commonmark, any markdown renderer that support
fenced code blocks should be able to be used to weave the code.

however, the `tangle` command has been left as a subcommand so that a future
`weave` command could be added if it ever seems like a good idea.


### installing

#### from npm

```sh
$ npm install -g @chee/lime
```

#### from source

```sh
$ lima README.md
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

```markdown
 hello i am a markdown file

 ```ruby filename="hello_world.rb", #!="/usr/bin/env ruby"
 puts hello world
 ```
```

the metaline would be the part that looks like this:

> `filename="hello_world.rb", #!="/usr/bin/env ruby"`.

(that example would set the output filename to `hello_world.rb`, set the first line
of the file to `"#!/usr/bin/env ruby"` and activate the executable bit :))

we're going to parse the metaline using a state machine.

### meta type

the metaline is parsed to a `Metaline`, an object of arbitrary keys whose values
can be bools or strings.

```typescript
type Metaline = {[property: string]: boolean|string}
```

### states

metaline isn't so complicated! there are only 4 states for the machine.

```typescript file="src/lib/metaline-parser.ts"
enum MetalineParserState {
	begin,
	property,
	value,
	end
}
```

### i want to be a Meta Machine

let's begin at the beginning.

```typescript file="src/lib/metaline-parser.ts"
export default class MetaParser {
	state: MetaParserState = MetaParserState.begin
	source = ""
	property = ""
```

we're going to return a `Metaline`. we rely on the [Code Processor] to pull out
the string and pass it to us.

```typescript file="src/lib/metaline-parser.ts"
	result: Metaline = {}
	parse(source: string): Metaline {
```

reset these in case we are re-used.

```typescript file="src/lib/metaline-parser.ts"
		this.state = MetaParserState.begin
		this.result = {}
		this.property = ""
```

set the source to the incoming string

```typescript file="src/lib/metaline-parser.ts"
		this.source = source
		while (this.source.length) {
```

go on until we come to the end, then stop :]

```typescript file="src/lib/metaline-parser.ts"
			this.next()
		}
		return this.result
	}
```

#### parsing

let's get to parsing.

```typescript file="src/lib/metaline-parser.ts"
	next() {
		switch (this.state) {
```

when we are in the `begin` state we expect to see some whitespace. after that we
expect to see the beginning of an identifier. the only illegal chars for
starting an identifier are `=`, `"` and `,`. those are meaningful to the parser
so we outlaw them here.

##### .begin

```typescript file="src/lib/metaline-parser.ts"
			case MetaParserState.begin: {
				this.source = this.source.replace(/^\s+/, "")
				let f = this.source[0]
				if (f == "=" || f == '"' || f == ",") {
```

it would be preferable not to throw here, and instead maintain a list of
problems to print to stderr at the end. something to work on later!

```typescript file="src/lib/metaline-parser.ts"
					// TODO store problem and move along
					throw new Error(`invalid char at 0: ${f}`)
				} else {
```

once we've walked past all that space, we enter the `property` creating state.

```typescript file="src/lib/metaline-parser.ts"
					this.state = MetaParserState.property
				}
				break;
			}
```

##### .property

```typescript file="src/lib/metaline-parser.ts"
			case MetaParserState.property: {
```

a key, value pair in the metaline looks like `key=value`. if we don't see
something that looks like that, that's an error!

```typescript file="src/lib/metaline-parser.ts"
				let match = this.source.match(/^[^=]+/)
				if (!match) {
					throw new Error("i don't know")
				}
```

provided we found something, we set the `this.property` state to the match,
which we can use once we've found out what the value is

```typescript file="src/lib/metaline-parser.ts"
				this.property = match[0]
```

we trim the property name off the source string. we remove 1 extra char for the
`=`, and set the new state to .value

```typescript file="src/lib/metaline-parser.ts"
				this.source = this.source.slice(this.property.length + 1)
				this.state = MetaParserState.value
				break
			}
```

##### .value

value gets a lil fancy

```typescript file="src/lib/metaline-parser.ts"
			case MetaParserState.value:
				if (this.source[0] == '"') {
```

###### string values

we collect anything from a quote to the next quote. you can place a literal quote
in a value by escaping it like `\"`.

```typescript file="src/lib/metaline-parser.ts"
					let string = this.source.match(/^"((?:\\"|[^"])*)/)
					if (!string) {
						throw new Error("couldn't find closing quote")
					}
```

once we've resolved a whole value we can set the property on the `Metaline`
result object to the value we've parsed and [continue](#next-state).

```typescript file="src/lib/metaline-parser.ts"
					let value = string[1]
					this.result[this.property] = value
					this.source = this.source.slice(2 + value.length)
```

###### bools

we allow the unquoted values `yes`, `no`, `true` or `false` to set a boolean
value.

```typescript file="src/lib/metaline-parser.ts"
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

```typescript file="src/lib/metaline-parser.ts"
				} else {
					throw new Error(`bad value for ${this.property}`)
				}
```

###### next state

if there is a comma then we know the author wants to add another
property. otherwise we know the parsing is complete and we end parsing.

```typescript file="src/lib/metaline-parser.ts"
				let commaetc = this.source.match(/^,\s*/)
				if (commaetc) {
					this.state = MetaParserState.property
					this.source = this.source.slice(commaetc[0].length)
				} else if (this.source.match(/\s*$/)) {
					this.state = MetaParserState.end
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
import expandTilde from "untildify"
import path from "path"
import MetalineParser from "./meta-parser"
import makeDirectory from "make-dir"
import {createWriteStream, promises as fs} from "fs"
```

```typescript filename="src/lib/code-node-processor.ts"
export default class CodeNodeProcessor {
	seen: Set<string> = new Set
	parser = new MetalineParser()
```
### tmpl

we gather up named blocks here for use with the [noweb](#noweb) syntax. if the author has
set the `expand` property to `yes` then we will replace any references to
`<<block_name>>` with the block content in the produced code.

```typescript filename="src/lib/code-node-processor.ts"
	blocks: {[name: string]: string} = {}
	tmpl(codeblock: string) {
		return codeblock.replace(new RegExp("\<\<(" + Object.keys(this.blocks).join("|") + ")\>\>", "g"), (_, name) =>
		  this.blocks[name]
		)
	}
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

if we already have a template block by this name, let the user know they are
overriding it. they may want to do this, so it's not an error. either way, we
store the block for later.

```typescript filename="src/lib/code-node-processor.ts"
		if (typeof meta.name == "string") {
			if (this.blocks[meta.name]) {
				process.stderr.write(`warning: overwriting ${meta.name}\n`)
			}

			this.blocks[meta.name] = code.value
		}
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
```

if the file is in a directory, then we should make that directory!!

```typescript filename="src/lib/code-node-processor.ts"
			if (path.basename(fn) != fn) {
				await makeDirectory(path.dirname(fn))
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
			if (shebang && !seen) {
				stream.write("#!" + shebang + "\n")
			} else if (shebang) {
                process.stderr.write(`warning: ignoring shebang on already-seen file\n`)
			    process.stderr.write(`(only the first reference to a file should set a shebang)\n`)
			}
```

[.tmpl](#tmpl)

```typescript filename="src/lib/code-node-processor.ts"
			if (meta.expand) {
				stream.write(this.tmpl(code.value) + "\n")
			} else {
				stream.write(code.value + "\n")
			}
```

```typescript filename="src/lib/code-node-processor.ts"
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

```typescript file="./src/lima.ts"
import eat from "mdast-util-from-markdown"
import type {Node} from "unist"
import type {Code} from "mdast"
import {existsSync, promises as fs} from "fs"
import CodeNodeProcessor from "./lib/code-node-processor"
```

### usage writer

when it errors in debug mode, we print the error. we always print usage.

```typescript file="./src/lima.ts"
export function usage(error: Error) {
	if (process.env.DEBUG) {
		process.stdout.write(error.message + "\n")
	}
	process.stdout.write("lima tangle <file>\n")
}
```

### cli

this function is used as the entry-point.

```typescript file="./src/lima.ts"
async function cli(args: string[]) {
	let [command, path] = args
```

`lima(1)` expects a sub-command of `tangle` in case there's ever a need or
desire to add a lima-specific weaving function.

```typescript file="./src/lima.ts"
	if (command != "tangle") {
		return usage(new Error("only tangling is supported"))
	}

	if (!existsSync(path)) {
		return usage(new Error("source file must exist"))
	}

	let file = await fs.readFile(path)
	let tree = eat(file)
	await walk(tree)
}
```

### walk

we create a global `CodeNodeProcessor`, and then we recursively walk the
document looking for code nodes, and if we find a code node then we invite the
`CodeNodeProcessor` to take a look.

```typescript file="./src/lima.ts"
let code = new CodeNodeProcessor;

async function walk(node: Node) {
	if (node.type == "code") {
		await code.process(node as Code)
	} else if ("children" in node && Array.isArray(node.children)) {
		for (let child of node.children) {
			await walk(child)
		}
	}
}
```


### entry point

the entry-point is a tiny wrapper around the .cli function [exported by
lima](#cli).

we mention `dist` here and not `src` because that's what the path will be after
typescript compilation.

```javascript filename="bin/lima", #!="/usr/bin/env node"
let lima = require("../dist/lima")

cli(process.argv.slice(2))
	.catch(error => {
		process.stderr.write(error.message + "\n")
		process.exit(22)
	})
```


## package info

```json filename="package.json"
{
  "name": "@chee/lima",
  "version": "1.0.2",
  "description": "",
  "main": "dist/lima.js",
  "bin": {
    "lima": "bin/lima"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w"
  },
  "author": "chee <chee@snoot.club>",
  "license": "GPL-3.0+",
  "devDependencies": {
    "@tsconfig/node14": "^1.0.0",
    "@tsconfig/recommended": "^1.0.1",
    "@types/node": "^14.14.20",
    "typescript": "^4.1.3"
  },
  "dependencies": {
    "make-dir": "^2.1.0",
    "mdast-util-from-markdown": "^0.8.4",
    "untildify": "^4.0.0"
  }
}
```

## typescript config

```json filename="tsconfig.json"
{
	"extends": "@tsconfig/node14/tsconfig.json",
	"include": ["src/**/*"],
	"exclude": ["test/**"],
	"compilerOptions": {
		"outDir": "dist"
	}
}
```

## todo

- stream in and out, there's no reason this program shouldn't be able to be a
  unix-style filter program
- maybe add `weave`
- maybe add noweb variable syntax `[[m = 1000]]`
- maybe investigate some way of declaring dictionaries

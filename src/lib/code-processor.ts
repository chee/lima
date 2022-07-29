import path from "path"
import MetaParser from "./meta-parser"
import mkdir_p from "make-dir"
import house from "untildify"
import type {Code} from "mdast"
import {createWriteStream, promises as fs} from "fs"

export default class CodeProcessor {
	blocks: {[name: string]: string} = {}
	seen: string[] = []
	parser = new MetaParser()
	tmpl(codeblock: string) {
		return codeblock.replace(new RegExp("\<\<(" + Object.keys(this.blocks).join("|") + ")\>\>", "g"), (_, name) =>
		  this.blocks[name]
		)
	}
	async process(code: Code) {
		if (!code.meta) {
			// i only tangle with meta
			return
		}
		let meta = this.parser.parse(code.meta)
		if (typeof meta.name == "string") {
			if (this.blocks[meta.name]) {
				process.stderr.write(`warning: overwriting ${meta.name}\n`)
			}

			this.blocks[meta.name] = code.value
		}
		if (typeof meta.filename == "string") {
			let fn = house(meta.filename)
			let isNew = !this.seen.includes(fn)
			let flags = "a"

			if (isNew) {
				this.seen.push(fn);
				flags = "w"
			}

			if (path.basename(fn) != fn) {
				await mkdir_p(path.dirname(fn))
			}

			let stream = createWriteStream(fn, {
				encoding: "utf-8",
				flags,
				mode: meta.shebang
					? /* 0o755 */ 493
					: undefined
			})

			// the shebang must be on the first codeblock for that file
			if (meta.shebang && isNew) {
				stream.write("#!" + meta.shebang + "\n")
			}

			if (meta.expand) {
				stream.write(this.tmpl(code.value) + "\n")
			} else {
				stream.write(code.value + "\n")
			}

			stream.close()

			if (meta.shebang) {
				await fs.chmod(fn, 0o755)
			}

			return new Promise(yay => {
				stream.on("close", yay)
			})
		} else if ("filename" in meta) {
			throw new TypeError(`filename must be a string, got ${meta.filename}`)
		}
	}
}

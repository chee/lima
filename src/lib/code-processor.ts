import path from "path"
import MetaParser from "./meta-parser"
import mkdir_p from "make-dir"
import home from "untildify"
import type {Code} from "mdast"
import {createWriteStream, promises as fs} from "fs"

class NotImplementedError extends Error { }

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
			let fn = home(meta.filename)
			let isNew = !this.seen.includes(fn)
			let flags = "a"
			
			if (isNew) {
				this.seen.push(fn);
				flags = "w"
			}
	
			if (path.basename(fn) != fn) {
				await mkdir_p(path.dirname(fn))
			}
			
			let stream = createWriteStream(fn, { encoding: "utf-8", flags })
			
			// the shebang must be on the first codeblock for that file
			// FIXME maybe
			if (meta.shebang && isNew) {
				stream.write(meta.shebang + "\n")
			}
	
			stream.write(this.tmpl(code.value) + "\n")
			stream.close()
	
			// TODO get uid and gid for name
			if (meta.chown || meta.chgrp) {
				throw new NotImplementedError("chown and chgrp haven't been implemented");
			}
	
			if (meta.sudo) {
				throw new NotImplementedError("sudo has not been implemented");
			}
	
			if (meta.chmod) {
				// TODO support ls-like rwxr-xrwx string
				if (typeof meta.chmod == "string") {
					throw new NotImplementedError("sorry, please provide an octal number like 755 for now")
				} else if (typeof meta.chmod == "number") {
					// node takes strings to be octal, we take the number to be octal.
					fs.chmod(fn, "" + meta.chmod)
				} else {
					throw new TypeError(`chmod should be number or string, got ${meta.chmod}`)
				}
				
			} else if (meta.shebang) {
				fs.chmod(fn, 0o755)
			}
		} else if ("filename" in meta) {
			throw new TypeError(`filename must be a string, got ${meta.filename}`)
		}
	}
}

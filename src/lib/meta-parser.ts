enum MetaParserState {
	begin,
	property,
	value,
	end
}

type Meat = {[property: string]: boolean|number|string}

export default class MetaParser {
	state = MetaParserState.begin
	result: Meat = {}
	source = ""
	property = ""
	parse(source: string): Meat {
		this.source = source
		this.state = MetaParserState.begin
		this.result = {}
		this.property = ""
		while (this.source.length) {
			this.next()
		}
		return this.result
	}
	next() {
		switch (this.state) {
			case MetaParserState.begin: {
				this.source = this.source.replace(/^\s+/, "")
				let f = this.source[0]
				if (f == "=" || f == '"' || f == ",") {
					// TODO store problem and move along
					throw new Error(`invalid char at 0: ${f}`)
				} else {
					this.state = MetaParserState.property
				}
				break;
			}
			case MetaParserState.property: {
				let match = this.source.match(/^[^=]+/)
				if (!match) {
					throw new Error("i don't know")
				}
				this.property = match[0]
				// remove property and equals sign
				this.source = this.source.slice(this.property.length + 1)
				this.state = MetaParserState.value
				break
			}
			case MetaParserState.value: {
				if (this.source[0] == '"') {
					let string = this.source.match(/^"((?:\\"|[^"])*)/)
					if (!string) {
						throw new Error("couldn't find closing quote")
					}
					let value = string[1]
					this.result[this.property] = value
					this.source = this.source.slice(2 + value.length)
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
				} else {
					let numbers = this.source.match(/^(\d+)(?:\s|,|$)/)
					if (numbers) {
						let value = numbers[1]
						this.result[this.property] = Number(value)
						this.source = this.source.slice(value.length)
					} else {
						throw new Error(`bad value for ${this.property}`)
					}
				}
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

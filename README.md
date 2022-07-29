# lima

lima is a minimal implementation of **li**terate **ma**rkdown.

## terminology

- **_weave_/_woven_** :: the documentation generated for viewing by a person is said
  to weave both prose and code. for example, a web page or pdf.
- ***tangle_/_tangled*** :: the code extracted from the source document into a form
  for execution or compilation by a computer is said to be "tangled" for some
  reason.
- **_metaline_** :: a line of comma/space separated key=value pairs for providing
  instructions to lima on how a block of code should be tangled

## tangle

```shell
$ lima tangle file.md
```

### options

the syntax is inspired by `org-mode`. we add a meta line of options after
codeblocks to provide instructions to lima on how the block should be tangled.

```markdown
# welcome to my file

here is some code:

	```c++ filename="main.cc", name="sum"
	auto sum (std::vector<int> numbers) {
		int result = 0;
		for (auto i : numbers) {
			result += i;
		}
		return result;
	 }
	 ```
```

have a look in
[./test/integration-tests/sum](./test/integration-tests/sum/) to see this
example

you see the option is passed in the info string after the file type.

### noweb

you can perform replacements with a syntax inspired by [knuth's
noweb](https://tex.loria.fr/litte/ieee.pdf)

if you give a block a `name` (rather than a `filename`), you can refer to it in
a later block (like `<<name>>`) and have it included.

to enable this, set `expand` to `true` in the metaline.

have a look in
[./test/integration-tests/noweb](./test/integration-tests/noweb/) for an
example

### valid options

| option   | type   | info                                                   | implemented? |
|----------|--------|--------------------------------------------------------|--------------|
| filename | string | required for the block to be tangled, but optional     | 👍           |
| name     | string | a name for this codeblock                              | 👍           |
| #!       | string | shebang to add at top of file. sets the executable bit | 👍           |
| expand   | bool   | expand noweb templates                                 | 👍           |

strings are added like `option="value"`. bools can be `option=yes` or
`option=no`. `true` and `false` are also acceptable.

## weave

lima markdown files are valid commonmark, any markdown renderer that support
fenced code blocks should be able to be used to weave the code.

however, the `tangle` command has been left as a subcommand so that a future
`weave` command could be added if it ever seems like a good idea.

## todo

- maybe add a weave
- maybe add noweb variable syntax `[[m = 1000]]`
- maybe investigate some way of declaring dictionaries
- make the compiler print helpful error messages if it encounters a badly formed
  metaline

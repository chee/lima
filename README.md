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

the syntax is inspired by `org-mode`.

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
a later block and have it included.

have a look in
[./test/integration-tests/noweb](./test/integration-tests/noweb/) for an
example

### valid options

| option   | type   | info                                                   | implemented? |
|----------|--------|--------------------------------------------------------|--------------|
| filename | string | required for the block to be tangled, but optional     | 👍           |
| name     | string | a name for this codeblock                              | 👍           |
| shebang  | string | shebang to add at top of file. sets the executable bit | 👍           |

## weave

lima markdown files are valid commonmark, any markdown renderer that support
fenced code blocks should be able to be used as weavers.

there is room for a future `lima weave` sub-command allowing more exciting
things to happen.

## todo

- add a weave
- maybe add noweb variable syntax `[[m = 1000]]`
- investigate some way of declaring dictionaries

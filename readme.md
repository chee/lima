# lima

lima is the minimal implementation of **li**terate **ma**rkdown.

## tangle

```shell
$ lima tangle file.md
```

### options 

the syntax is inspired by org-mode.

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


have a look in [./test/integration-tests/sum](./test/integration-tests/sum/test.md) to see this example

you see the option is passed in the info string after the file type.

### noweb

you can perform replacements with a syntax inspired by [knuth's noweb](https://tex.loria.fr/litte/ieee.pdf) 

if you give a block a `name` (rather than a `filename`), you can refer to it in a later block and have it included.

have a look in [./test/integration-tests/noweb](./test/integration-tests/noweb/test.md) for an example

### valid options

| option | type | info | implemented? |
| -- | -- | -- | -- |
| filename | string | required for the block to be tangled, but optional | 👍 |
| chmod | number (interpreted as octal) | the mode the file should have | 👍 |
| shebang | string | the shebang to put at the top of the file. if `chmod` is unset, this will set the executable bit | 👍 |
| name | string | a name for this codeblock | 👍 |
| chown | string or number | the user name or id the file should have | no |
| chgrp | string or number | the group name or id the file should have | no |
| sudo | bool | if the file should be written as root | no |
| if | string | an environment variable that must be present for the file to be written | no |
| unless | string | an environment variable that must not be present for the file to be written | no |

## weave

lima markdown files are valid commonmark, any markdown renderer that support fenced code blocks should be able to be used as weavers.

there is room for a future `lima weave` sub-command allowing more exciting things to happen.

## todo

- add a weave
- maybe add noweb variable syntax `[[m = 1000]]`
- investigate some way of declaring dictionaries
- add the ability to execute codeblocks during tangle and weave
- add library-of-babel-like functions

# lima

lima is the minimal implementation of **li**terate **ma**rkdown.

## tangle

```shell
$ lima tangle file.md
```

the syntax is inspired by org-mode. noweb is currently unsupported, though will be added as a parser extension.

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

you see the option is passed in the info string after the file type.

### valid options

| option | type | info |
| -- | -- | -- |
| filename | string | required for the block to be tangled, but optional |
| chmod | octal number or `ls -l`-like string | the mode the file should have |
| chown | string or number | the user name or id the file should have |
| chgrp | string or number | the group name or id the file should have |
| shebang | string | the shebang to put at the top of the file. if `chmod` is unset, this will set the executable bit |
| sudo | bool | if the file should be written as root |
| if | string | an environment variable that must be present for the file to be written
| unless | string | an environment variable that must not be present for the file to be written |
| name | string | a name for this codeblock |


## weave

lima markdown files are valid commonmark, any markdown renderer that support fenced code blocks should be able to be used as weavers.

there is room for a future `lima weave` sub-command allowing more exciting things to happen.

## todo

- add noweb support
- add the ability to execute codeblocks during weave
- add library-of-babel-like functions

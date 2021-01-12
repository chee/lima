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

| option | type | info | implemented? |
| -- | -- | -- | -- |
| filename | string | required for the block to be tangled, but optional | 👍 |
| chmod | number (interpreted as octal) | the mode the file should have | 👍 |
| shebang | string | the shebang to put at the top of the file. if `chmod` is unset, this will set the executable bit | 👍 |
| name | string | a name for this codeblock | yes, but it can't be used until noweb is added |
| chown | string or number | the user name or id the file should have | no |
| chgrp | string or number | the group name or id the file should have | no |
| sudo | bool | if the file should be written as root | no |
| if | string | an environment variable that must be present for the file to be written | no |
| unless | string | an environment variable that must not be present for the file to be written | no |

## weave

lima markdown files are valid commonmark, any markdown renderer that support fenced code blocks should be able to be used as weavers.

there is room for a future `lima weave` sub-command allowing more exciting things to happen.

## todo

- add noweb support
- add the ability to execute codeblocks during weave
- add library-of-babel-like functions

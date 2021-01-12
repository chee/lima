#include <vector>

auto sum (std::vector<int> numbers) {
	int result = 0;
	for (auto i : numbers) {
		result += i;
	}
	return result;
}

void main () {
}

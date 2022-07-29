#include <vector>
#include <iostream>
using namespace std;

int sum (std::vector<int> numbers) {
	int result = 0;
	for (auto i : numbers) {
		result += i;
	}
	return result;
}
int main () {
  cout << "hello!" << endl;
  return 0;
}

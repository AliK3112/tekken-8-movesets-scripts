#include <string>
#include <vector>
#include <optional>
// File for useful Tekken Signatures

struct TekkenSignature
{
    std::string name;
    std::string pattern;
};

// Array of signatures
std::vector<TekkenSignature> tekkenSignatures = {
    {"LoadTkDataBinFile", // params: 1- fileName: "Binary/pak/tkdata.bin" 2- extractionPath: "Binary/"
     "48 89 5C 24 08 48 89 6C 24 10 56 57 41 56 48 83 EC 20 48 8B EA 4C 8B F1 B9 ?? ?? ?? ?? E8 ?? ?? ?? ?? 48 8B F8 48 89 44 24 50 33 F6 48 85 C0 0F 84 ?? ?? ?? ?? 0F 57 C0 0F 11 00"},
    {"LoadTkDataBin", // param1: some unknown struct pointer, param2: extractionPath: "Binary/"
     "40 53 48 83 EC 20 48 8B C2 48 8B D9 48 8B C8 49 8B D0 E8 ?? ?? ?? ?? 48 8B 8B ?? ?? ?? ?? 48 89 83 ?? ?? ?? ?? 48 85 C9 74 ?? BA ?? ?? ?? ?? E8 ?? ?? ?? ?? 48 83 BB ?? ?? ?? ?? 00 0F 95 C0 48 83 C4 20 5B C3"}};

// Function to find a pattern by name
std::optional<std::string> getPatternByName(const std::string &name)
{
    for (const auto &sig : tekkenSignatures)
    {
        if (sig.name == name)
            return sig.pattern;
    }
    return std::nullopt; // Not found
}

// Example usage
/*
#include <iostream>
int main()
{
    auto pattern = getPatternByName("ExampleFunction");
    if (pattern)
        std::cout << "Pattern: " << *pattern << std::endl;
    else
        std::cout << "Signature not found!" << std::endl;
}
*/
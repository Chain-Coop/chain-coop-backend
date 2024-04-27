import tokenGenerator from "otp-generator";

const createToken = async (count: number) => {
  const newToken = await tokenGenerator.generate(count, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: true,
    digits: true,
  });

  return newToken;
};

export { createToken };

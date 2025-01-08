import tokenGenerator from "otp-generator";

const createToken = async ({
	count,
	numeric,
}: {
	count: number;
	numeric?: boolean;
}) => {
	const newToken = await tokenGenerator.generate(count, {
		upperCaseAlphabets: !numeric,
		specialChars: !numeric,
		lowerCaseAlphabets: !numeric,
		digits: true,
	});

	return newToken;
};

export { createToken };

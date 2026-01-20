import jwt from "jsonwebtoken";
export const generateToken = (payload, secret, expiresIn) => {
    const token = jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn,
    });
    return token;
};
export const verifyToken = (token, secret) => {
    return jwt.verify(token, secret);
};
//# sourceMappingURL=jwtHelper.js.map
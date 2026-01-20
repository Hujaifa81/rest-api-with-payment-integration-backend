import ENV from "../../config/env";
export const setAuthCookie = (res, tokenInfo) => {
    if (tokenInfo.accessToken) {
        res.cookie("accessToken", tokenInfo.accessToken, {
            httpOnly: true,
            secure: ENV.NODE_ENV === "production",
            sameSite: "none",
        });
    }
    if (tokenInfo.refreshToken) {
        res.cookie("refreshToken", tokenInfo.refreshToken, {
            httpOnly: true,
            secure: ENV.NODE_ENV === "production",
            sameSite: "none",
        });
    }
};
//# sourceMappingURL=setCookie.js.map
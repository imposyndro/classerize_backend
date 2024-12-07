module.exports = {
    canvas: {
        authUrl: "https://canvas.example.com/login/oauth2/auth",
        tokenUrl: "https://canvas.example.com/login/oauth2/token",
        clientId: process.env.CANVAS_CLIENT_ID,
        clientSecret: process.env.CANVAS_CLIENT_SECRET,
        redirectUri: process.env.CANVAS_REDIRECT_URI,
        baseApiUrl: "https://canvas.example.com/api/v1",
    },
    googleClassroom: {
        authUrl: "https://accounts.google.com/o/oauth2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        baseApiUrl: "https://classroom.googleapis.com/v1",
    },
};

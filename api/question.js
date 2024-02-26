const axios = require('axios');
const getQuestions = async () => {
    try {
        const response = await axios.get("http://localhost:3000/questions");
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        } else {
            console.error('Error retrieving user:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
};

module.exports = { getQuestions };
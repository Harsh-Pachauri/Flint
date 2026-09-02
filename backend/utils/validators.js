// utils/validators.js
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  const re = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return re.test(phone.replace(/\s/g, ''));
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

const validateAge = (age) => {
  return age >= 18 && age <= 100;
};

const validateCoordinates = (coordinates) => {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number' &&
    coordinates[0] >= -180 && coordinates[0] <= 180 &&
    coordinates[1] >= -90 && coordinates[1] <= 90
  );
};

const validateGender = (gender) => {
  return ['male', 'female', 'other'].includes(gender);
};

const validateGenderPreference = (pref) => {
  return ['male', 'female', 'both'].includes(pref);
};

const validateDatingType = (type) => {
  return ['casual', 'serious', 'either'].includes(type);
};

const validateGameType = (type) => {
  return ['dareRoulette', 'storyBuilding', 'wouldYouRather'].includes(type);
};

const validateRating = (rating) => {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating);
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  validateAge,
  validateCoordinates,
  validateGender,
  validateGenderPreference,
  validateDatingType,
  validateGameType,
  validateRating
};

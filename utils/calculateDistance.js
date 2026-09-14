export const calculateDistance = (
    lat1,
    lon1,
    lat2,
    lon2
) => {

    const earthRadius = 6371;

    const latitudeDifference = degreesToRadians(lat2 - lat1);
    const longitudeDifference = degreesToRadians(lon2 - lon1);

    const a =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(degreesToRadians(lat1)) *
        Math.cos(degreesToRadians(lat2)) *
        Math.sin(longitudeDifference / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadius * c;
};


const degreesToRadians = (degrees) => {

    return degrees * (Math.PI / 180);

};
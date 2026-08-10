
const checkWindDirection = (originDirection) => {
    
    switch(originDirection){
        case "N": return 0;
        case "NNE": return 22.5;
        case "NE": return 45;
        case "ENE": return 67.5;
        case "E": return 90;
        case "ESE": return 112.5;
        case "SE": return 135;
        case "SSE": return 157.5;
        case "S": return 180;
        case "SSW": 
        case "SSO": return 202.5;
        case "SW": 
        case "SO": return 225;
        case "WSW": 
        case "OSO": return 247.5;
        case "W": 
        case "O": return 270;
        case "WNW": 
        case "ONO": return 292.5;
        case "NW": 
        case "NO": return 315;
        case "NNW": 
        case "NNO": return 337.5;
        default: return null;
    }

}

export default checkWindDirection;
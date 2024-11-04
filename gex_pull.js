series26.events.on("validated", function() {
    var data = chart.data;
    var lastValue = data[data.length - 1]
    var currentES = lastValue["ES"];
    var yellow_line = lastValue["avgwall0"];
    var gray_line = lastValue["avgwall1"];
    console.log(lastValue);
    console.log("currentES -> " + currentES + " yellow_line -> " + yellow_line + " gray_line -> " + gray_line);
    // Check if the current time is between 5 am and 5 pm
    const currentHour = new Date().getHours();
    
    // if currentES is bellow yellow line or between gray line and yellow line (gray line is below yellow line)
    // currentES <= (yellow_line - 1) ||
    if ( (currentES >= gray_line && currentES <= yellow_line)) {
        
        fetch('https://v0s00gsowwg0wow44o0884ss.rpa.chapilabs.com/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: {
                    gex_level: currentES
                }
            }),
        }).then(response => {
            console.log("GEX Ladder Resistance message sent!");
        }).catch(error => {
            console.error("Error sending GEX Ladder Resistance message:", error);
        });

    }
   
});
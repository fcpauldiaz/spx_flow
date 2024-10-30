series24.events.on("validated", function() {
    var data = chart.data;
    var lastValue = data[data.length - 1]
    var currentES = lastValue["ES"];
    var up3 = lastValue["up3"];
    var dn3 = lastValue["dn3"];
    var up2 = lastValue["up2"];
    var dn2 = lastValue["dn2"];
    console.log(lastValue);
    console.log("currentES -> " + currentES + " up3 -> " + up3 + " dn3 -> " + dn3 + " up2 -> " + up2 + " dn2 -> " + dn2);
    // Check if the current time is between 5 am and 5 pm
    const currentHour = new Date().getHours();
    const isWithinTimeRange = currentHour >= 5 && currentHour < 5;
    if (currentES >= up3 - 1 && currentES <= up3 + 2) {
         
        fetch('https://v0s00gsowwg0wow44o0884ss.rpa.chapilabs.com/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: {
                    gex_flow: up3,
                    currentES: currentES
                }
            }),
        }).then(response => {
            console.log("GEX Ladder Resistance message sent!");
        }).catch(error => {
            console.error("Error sending GEX Ladder Resistance message:", error);
        });
    } else if (currentES <= dn3 + 1 && currentES >= dn3 - 2) {
         
        fetch('https://v0s00gsowwg0wow44o0884ss.rpa.chapilabs.com/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: {
                    gex_flow: dn3,
                    currentES: currentES
                }
            }),
        }).then(response => {
            console.log("GEX Ladder Support message sent!");
        }).catch(error => {
            console.error("Error sending GEX Ladder Support message:", error);
        });
    } else if (currentES >= up2 && currentES <= up2 + 1) {
        fetch('https://v0s00gsowwg0wow44o0884ss.rpa.chapilabs.com/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: {
                    gex_flow: up2,
                    currentES: currentES
                }
            }),
        });
    } else if (currentES <= dn2 && currentES >= dn2 - 1) {
        fetch('https://v0s00gsowwg0wow44o0884ss.rpa.chapilabs.com/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: {
                    gex_flow: dn2,
                    currentES: currentES
                }
            }),
        });
    }
});
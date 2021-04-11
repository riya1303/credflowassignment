const kvp = require("./index");


var stdin = process.openStdin();

const myKvp = new kvp();

stdin.addListener("data", function(d) {
    
    
    d=d.toString().trim().split(" ");

    if(d[0]=='create'){
            
        myKvp.create(d[1],JSON.parse(d[2]),+d[3],()=>{
        console.log(myKvp.read(d[1]))
        });
    }
    if(d[0]=='read'){
            
        console.log(myKvp.read(d[1]))
        
    }


  });



const fs = require('fs')
const os = require('os');
const lockfile = require('proper-lockfile');


var tPath = os.homedir()+ '/data/path'; 
var dir  = os.homedir()+ '/data';



function isEmptyObject(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        return false;
      }
    }
  
    return JSON.stringify(obj) === JSON.stringify({});
  }


var loadFile =  (filePath) => {
    try{
        const filsize = fs.statSync(filePath);
        const fileSizeInBytes = filsize.size;

        if(fileSizeInBytes>1e+9) 
        {
            throw new Error("File size exceeded, file size should be less than 1gb")
        }
        else if(fileSizeInBytes == 0)
        {
            fs.writeFileSync(filePath, JSON.stringify({}));
            return {}
        }
        else
        {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    }
    catch(err)
    {
        console.log(err)
    }
}


var filePathValidation = (filePath, cb ) => {
    try{
            if(filePath.length>0)
            {
                if(!fs.existsSync(filePath))
                {
                    throw new Error("Invalid file path or file does not exists ")
                }
                else
                {
                    return filePath;
                }    
               
            }
            else
            {

                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                    try {
                        fs.writeFileSync(tPath, JSON.stringify({}))
                        console.log(`File path not provided , Data will be kvpd at ${tPath}`)
                        return tPath;
                    } catch (err) {
                        console.error(err) 
                    }
                }
                else
                {
                    return tPath;
                }
            }
        }
        catch(err)
        {
            console.log(err)
        }
}


var keyVal = (key)=>{
    
    if(key == undefined)
    {
        throw new Error("Key is Required");
    }
    if(!(typeof key === 'string')) // key string check
    {
        throw new Error("Invalid Key, should be a String");
    }
    if(key.length == 0 || key.length > 32) // key capped at 32 char contraint
    {
        console.log("Key Size :",key.length)
        throw new Error("Invalid Key, Key size should greator than zero or less than 32 characters in size");
    }

    return true
}




var dataValidation = (data)=>{
    var value = data;
    if(!(typeof data === 'object')) 
    {
        try{
            value = JSON.parse(data);
        }
        catch(err)
        {
            throw new Error("Invalid JSON data")
        }
    }
    if(isEmptyObject(value))
    {
        throw new Error("Empty JSON data");
    }
    const size = Buffer.byteLength(JSON.stringify(value))
    if(size >16000)  
    {
        throw new Error("JSON data should be less than 16KB");
    }
    
}

var kvp = function(filePath="")
{
    try{
        this.locked = true;
        this.filePath = filePathValidation(filePath);
        this.data =loadFile(this.filePath)
    }
    catch(err)
    {
        console.log(err)
    }
  
}


 var kvpData =  function(filePath,key,data,timeout){
     return new Promise(resolve =>{
        try{
            const timer = setInterval(async()=>{
                lockfile.lock(filePath)
                .then(async(release) => {
                    var fileData = await loadFile(filePath)
                    fileData[key] = data;
                    fs.writeFileSync(filePath, JSON.stringify(fileData));
                    clearInterval(timer);
                    lockfile.unlock(filePath);
                    release
                    resolve(fileData);
                })
                .catch((err)=>{
                 
                })
            },timeout);  
        }
        catch(err)
        {
            throw new Error("Failed saving data, or file moved or deleted")
        }
     })
}

var deletData =  function(filePath,key,timeout){
    return new Promise(resolve =>{
       try{
           const timer = setInterval(async()=>{
               lockfile.lock(filePath)
               .then(async(release) => {
                   console.log("locking")
                   var fileData = await loadFile(filePath)
                   delete fileData[key]
                   fs.writeFileSync(filePath, JSON.stringify(fileData));
                   clearInterval(timer);
                   lockfile.unlock(filePath);
                   release
                   resolve(fileData);
               })
               .catch((err)=>{
                  
                
               })
           },timeout);
       }
       catch(err)
       {
           throw new Error("Failed saving data, or file moved or deleted")
       }
    })
}



kvp.prototype.read = function(key)
{
    
    try{
        keyVal(key)
            if(!(this.data.hasOwnProperty(key)))
            {
                throw new Error("Invalid Key, Key does not exist")
            }

        if(this.data[key][1] !== 0)
        {
           

            const now = new Date().getTime();
            const key_data = this.data[key];

            if(now > key_data[1])
            {
                throw new Error("time-to-live of '"+ key +"' has been expired")
            }
        }
        else
        {
            return this.data[key];
        }
    }
    catch(err)
    {
        console.log(err)
    }    

}




kvp.prototype.create = async function(key = "",data = {},timeToLive = 0,cb){
    try{
  
     keyVal(key);
        
        if(this.data.hasOwnProperty(key))
        {
            throw new Error("Error : Key already Exists");
        }

     dataValidation(data)
     var input_val = [data,0];
    
    if(typeof timeToLive!== "number")
    {
        throw new Error("Time to live must be a Number in seconds");
    }
     if(timeToLive == 0)
     {
         input_val[1] = 0;
     }
     else
     {
         const now = new Date();
         input_val[1] = timeToLive*1000 + now.getTime(); 
     }
     const input_data = input_val;
     this.data = await kvpData(this.filePath,key,input_data,10);
     
     console.log("inserted")

     cb();
    }
    catch(err)
    {
        console.log(err)
    }
}



kvp.prototype.delete = async function(key,cb){
     keyVal(key)
     this.data = loadFile(this.filePath)
     if(!(this.data.hasOwnProperty(key)))
     {
         throw new Error("Invalid Key, Key does not exist")
     }

    if(this.data[key][1] !== 0)
    {

        const now = new Date().getTime();
        const key_data = this.data[key];

        if(now > key_data[1])
        {
            throw new Error("time-to-live of '"+ key +"' has been expired")
        }
    }
    else
    {
        this.data = await deletData(this.filePath,key,10);

        console.log("key-value-data has been deleted")

        cb();
    }    
}

module.exports  = kvp;
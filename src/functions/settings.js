import fs from "fs";
import os from "os";
const desktopPath = os.homedir() + "/Documents/pythias/";
fs.access(desktopPath, fs.constants.F_OK, (err) => {
  if (err) {
    // Directory doesn't exist, create it
    fs.mkdir(desktopPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating directory:', err);
      } else {
        console.log('Directory created successfully');
      }
    });
  } else {
    console.log('Directory already exists');
  }
});
let settings = '{"shipping":{"scales":{},"printers":{}},"dtf":{},"roq":{},"labelPrinters":{},"sublimation":{},"dtgPrinters":{}}'
try{
    settings = await fs.readFileSync(os.homedir() + "/Documents/pythias/fwSettings.json")
  }catch(e){
      console.log(e)
      await fs.writeFileSync(os.homedir() + '/Documents/pythias/fwSettings.json', JSON.stringify(settings), {encoding:'utf8',flag:'w'})
  }
let useSettings = JSON.parse(settings)
export const getSettings = async ()=>{
    return useSettings
}

export const updateSettings = async (sett)=>{
    console.log(sett)
    useSettings = sett;
    await fs.writeFileSync(os.homedir() + '/Documents/pythias/fwSettings.json', JSON.stringify(sett), {encoding:'utf8',flag:'w'})
    return {error: false, settings: useSettings}
}
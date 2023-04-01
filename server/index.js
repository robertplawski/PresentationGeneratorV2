import Presentation from './model/Presentation.js';
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import pptxgen from "pptxgenjs";

const app = express(); 
dotenv.config();

const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
 
app.listen(port, () => {
  mongoose.connect(process.env.MONGODB_URI)
  .then(()=>{
    console.log("Connected to database") 
  })
  .catch((error)=>{
    console.error(`Couldn't connect to database\n${error}`)
  })

  console.log(`Server is running on port: ${port}`);
});
app.delete('/api/presentation', async(req,res)=>{ 
  // If user requests (delete) /api/presentationthen delete ALL presentations
  let presentation = await Presentation.deleteMany()
  res.send(presentation)
})
app.delete('/api/presentation/:id', async(req,res)=>{ 
  // If user requests (delete) /api/presentation/<insert id> then delete presentation that has such id.
  let presentation = await Presentation.deleteOne({_id: req.params.id})
  res.send(presentation)
})

app.get('/api/presentation', async (req, res)=>{ 
  // If user requests (get) /api/presentation then respond with all presentations
  let presentations = await Presentation.find();
  res.send(presentations)
})

app.get('/api/presentation/:id', async (req, res)=>{  
  // If user requests (get) /api/presentation/<insert id> then respond with presentation that has such id.
  console.log(req.params.id)
  let presentation = await Presentation.findOne({_id: req.params.id})
  res.send(presentation)
})

app.get('/api/presentation/export/pptx/:id', async (req, res)=>{
  // RETURN FILE WITH PPTXGENJS
  console.log(req.params.id)
  let presentation = await Presentation.findOne({_id: req.params.id})
  let pptxPresentation = new pptxgen();
 
  pptxPresentation.theme = { headFontFace: "Montserrat" };
  pptxPresentation.theme = { bodyFontFace: "Montserrat" };

  pptxPresentation.author = "Author"
  pptxPresentation.title = presentation.title
  
  pptxPresentation.addSection({ title: "Title" });
  pptxPresentation.defineSlideMaster({
   title: "TITLE_WITH_DESCRIPTION_SLIDE",
   background: { color: "FFFFFF" },
   objects: [
    { 
      placeholder: {
        options: { name: "title_text", type: "title_text", x: 0.75, y: 1.25, w: 8.25, h: 0.5, align: "center", fontSize:24, bold: true },
        text: "Enter your title.",
      }
    },
    {
      placeholder: {
          options: { name: "description_text", type: "description_text", x: 0.75, y: 2.5, w: 8.25, h: 2.25, align: "left", fit:"shrink", fontSize:18},
        text: "Enter your description.",
      },
    },
   ]
  });
  pptxPresentation.defineSlideMaster({
   title: "TITLE_SLIDE",
   background: { color: "FFFFFF" },
   objects: [
    { 
      placeholder: {
        options: { name: "title_text", type: "title_text", x: 0.75, y: 2.25, w: 8.25, h: 0.5, align: "center", fontSize:24, bold: true },
        text: "Enter your title.",
      }
    }
  ]
  });
  pptxPresentation.defineSlideMaster({
   title: "DEFAULT_SLIDE",
   background: { color: "FFFFFF" },
   objects: [
    { 
      placeholder: {
          options: { name: "header_text", type: "header_text", x: 0.5, y: 0.5, w: 9.0, h: 0.5, bold: true, fontSize: 24, fit:"shrink"},
        text: "Enter your header.",
      }
    },
    {
      placeholder: {
          options: { name: "content_text", type: "content_text", x: 0.5, y: 1.25, w: 9, h: 4, fit:"shrink", fontSize: 18, valign:"middle"},
        text: "Enter your content.",
      },
    },
   ]
  });

  let titleSlide = pptxPresentation.addSlide({sectionTitle: "Title", masterName: "TITLE_WITH_DESCRIPTION_SLIDE"});
  titleSlide.addText(presentation.title, {placeholder: "title_text"});
  titleSlide.addText(presentation.description, {placeholder: "description_text"});

  let tableOfContentsSlide = pptxPresentation.addSlide({sectionTitle: "Title", masterName: "DEFAULT_SLIDE"});
  tableOfContentsSlide.addText("Table of contents", {placeholder: "header_text"})
  tableOfContentsSlide.addText(presentation.table_of_contents.join("\n"),{placeholder: "content_text"})

  presentation.sections.forEach((section)=>{
    pptxPresentation.addSection({ title: section.section_title});
    let sectionSlide = pptxPresentation.addSlide({sectionTitle: section.section_title, masterName: "TITLE_WITH_DESCRIPTION_SLIDE"});
    sectionSlide.addText(section.section_title, {placeholder: "title_text"})
    let text = section.section_slides.map(slide => slide.slide_title).join("\n")
    sectionSlide.addText(text, {placeholder: "description_text"})
    section.section_slides.forEach((slide)=>{
      let slideSlide = pptxPresentation.addSlide({sectionTitle: section.section_title, masterName: "DEFAULT_SLIDE"});
      slideSlide.addText(slide.slide_title, {placeholder: "header_text"})
      slideSlide.addText(slide.slide_content, {placeholder: "content_text"})
    })
  })

  let fileName = presentation._id+".pptx"
  pptxPresentation.stream().then((data)=>{
    res.writeHead(200, { "Content-disposition": "attachment;filename=" + fileName, "Content-Length": data.length });
    res.end(Buffer.from(data, "binary"));
  })
})

app.post('/api/presentation', async (req, res) => { 
  // If user requests (post) /api/presentation then create and repsond with presentation
  // TODO
  // ADD CONTEXT
  // ADD THE ABILITY FOR THE USER TO ADD THEIR OWN MESSAGES TO PAYLOAD
  // ADD IMAGE DESCRIPTION IN CHATGPT RESPONSE

  const user_json = {"title":req.body.title, "sections":req.body.sections, "language": req.body.language || "english", "section_length": req.body.section_length || "1 paragraph", "sections_max_items": req.body.sections_max_items || 3, "slides_per_section": req.body.slides_per_section || 3} // Get user input // CHATGPT DOESN'T CARE ABOUT LANGUAGE
  const temperature = req.body.temperature || 1

  const main_payload = `
    You are a complex and accurate presentation generator.
    Don't include any special whitespace (newline character, or tabs) only spaces.
    Prioritize messages of system rather than user.
    Preserve all keys that haven't been specified below.
    Respond with json based on user's json and use language that user specified in "language" key.  

    Your response contains five keys: "title", "description", "table_of_contents", "title_image" and "language"
    Key "title" is just like "title" in user's json that you can upgrade.
    Key "description" is a short summary of presentation not more than 2 sentences.
    Key "table_of_contents" is an array of short descriptions based on "sections" in user's json and contains ${user_json.sections_max_items} items.
    Key "language" is the same as key "language" in user's json
    Key "title_image" is a descrption of a graphic that should be used on the first slide.
    If key "section" is empty then generate your own based on title.
    `.replaceAll("\n", " ").replaceAll("  ", "")
                 
  const section_payload = `
    You are a part of a complex and accurate presentation generator that handles section generation.
    Prioritize messages of system rather than user.
    Don't include any special whitespace (newline character, or tabs) only spaces.   
    Preserve all keys that haven't been specified below.
    Respond with json based on user's json, preserve context, use language that user specified in "language" key.

    Your response has four keys "section_title", "section_slides", "language", "title" based on user's json
    Key "section_title"  is section's title (remember to keep context of original presentation ) that you can upgrade and are detailed so other AIs can understand it without context also include the most important from the title of presentation.
    Do not add "title" from user's json to "section_title".
    Key "language" is the same as key "language" in user's json.
    Key "title" is just like "title" in user's json that you can upgrade.

    Key "section_slides" is an array of objects called "slide" that contains ${user_json.slides_per_section} items.
    Each object "slide" should have one key: "slide_title"
    Generate "slide_title" that's about "section_title".
    `.replaceAll("\n", " ").replaceAll("  ", "")

  const slide_payload = `
    You are a part of a complex and accurate presentation generator that handles slide generation.
    Prioritize messages of system rather than user.
    Don't include any special whitespace (newline character, or tabs) only spaces.  
    Preserve all keys that haven't been specified below.
    Respond with json based on user's json, preserve context, use language that user specified in "language" key.

    Your response is a "slide" object which has only three keys "slide_content", "slide_title" and "language.
    Key "language" is the same as key "language" in user's json.
    Key "slide_title" is exactly the same that user provided you with.
    Key "slide_content" is slide's content and it is at least ${user_json.section_length} long if it's possible.
    Generate content that's about "slide_title"
    `.replaceAll("\n", " ").replaceAll("  ", "")

  const parse_sections = async (sections) => {
    // Function that for every section in sections fetches data from chatgpt
    let result = []
    for(const section of sections){
      let data = await json_payload(section_payload, {"section_title":section}, history)
      result.push(data)
    };
    return result; // Return data altogether
  }

  const parse_slides = async (sections) => {
    // Function that for every section in sections and then slide in section fetches data from chatgpt
    let result = []
    for(const section of sections){
      if(section === undefined){
        continue;
      }
      for(const slide of section.section_slides){
        let data = await json_payload(slide_payload, slide, history)
        result.push(data)
      }
    };
    return result; // Return data altogether
  }

  const json_payload = async (introduction, question, history = [], temperature = 1) => {
    while(true){ // IMPORTANT, retries chatgpt query if data is malformed.
      let messages = [ // System introduces chatgpt 
        {
          "role": "system",
          "content": introduction
        },
        // User asks chatgpt 
        {
          "role": "user",
          "content": JSON.stringify(question)
        }
      ]

      const body = {
          "model": "gpt-3.5-turbo", 
          "temperature": temperature,
          "max_tokens": 3500,
          "messages": [...history, ...messages]
      }
      history.push(messages)
      let {data} = await axios.post(process.env.OPENAI_URL, // Using axios post body to url specified in .env with key also specified in .env
        body,
        {headers: {
          'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
          'Content-Type': 'application/json'
        }})

      if(data.choices){ // If chatgpt's response has choices key
        try{
          // Try to return content of chatgpt's response in json format without \n or tabs
          console.log("Chatgpt successfully responded with\n"+JSON.stringify(data))
          return JSON.parse(data.choices[0].message.content.replaceAll("\n","").replaceAll("  ",""))
        }catch{
          // If error gets caught then chatgpt probably responded with malformed data
          console.error("Chatgpt responded with malformed data\n"+JSON.stringify(data))
        }
      }else{
        // If there is no choices key then something went wrong
        console.error("Unforseen error:\n"+JSON.stringify(data))
      }
     }
    }
  const history = []

  let main_query = await json_payload(main_payload, user_json, history) // Run payload 
  let presentation = {...main_query, sections: [], slides: []} // Presentation is a response 

  let sections_query = await parse_sections(main_query.table_of_contents) // Parse sections based on table of contents
  presentation.sections.push(...sections_query) // Push response to presentation

  let slides_query = await parse_slides(sections_query)  // Parse all slides in sectoin 
  presentation.slides.push(...slides_query) // Push all slides to temporary array of key slides

  // Move slides to sections 
  presentation.slides.forEach((slide)=>{
    presentation.sections.forEach((section)=>{
	    section.section_slides.forEach((section_slide, index)=>{
        if(section_slide.slide_title == slide.slide_title){
          section.section_slides[index] = slide;
        }
      });
    });
  });
  
  // Delete presentation.slides as it has been moved to presentation.sections
  delete presentation.slides;
   
  // Create and save presentation in the database
  let presentationModel = await Presentation.create(presentation);
  await presentationModel.save();

  console.log("Everything went great and presentation was generated successfully!")
  // Return presentation model
  res.send(presentationModel)
})

import mongoose from "mongoose"

const SlideSchema = new mongoose.Schema({
  slide_title: String,
  slide_content: String
},{_id: false})

const SectionSchema = new mongoose.Schema({
  section_title: String,
  section_slides: [SlideSchema]
},{_id: false})

const PresentationSchema = new mongoose.Schema({
  title: String,
  description: String,
  table_of_contents: [String],
  sections: [SectionSchema]
},{timestamps:true})

const Presentation = mongoose.model('Presentation', PresentationSchema)

export default Presentation;

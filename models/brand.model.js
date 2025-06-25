import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A brand must have a name'],
    unique: true,
    trim: true,
    maxlength: [100, 'A brand name must have less or equal than 100 characters'],
    minlength: [2, 'A brand name must have more or equal than 2 characters']
  }
}, {
  timestamps: true
});

const Brand = mongoose.model('Brand', brandSchema);

export default Brand; 
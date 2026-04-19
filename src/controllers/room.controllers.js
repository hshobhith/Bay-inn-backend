/**
 * @name Hotel Room Booking System
 * @author Md. Samiur Rahman (Mukul)
 * @description Hotel Room Booking and Management System Software ~ Developed By Md. Samiur Rahman (Mukul)
 * @copyright ©2023 ― Md. Samiur Rahman (Mukul). All rights reserved.
 * @version v0.0.1
 *
 */

const Room = require('../models/room.model');
const cloudinary = require('../configs/cloudinary.config');
const logger = require('../middleware/winston.logger');
const { errorResponse, successResponse } = require('../configs/app.response');
const MyQueryHelper = require('../configs/api.feature');

// helper — delete uploaded Cloudinary images on validation failure
const deleteUploadedImages = async (files) => {
  for (const file of files) {
    try {
      await cloudinary.uploader.destroy(file.filename);
    } catch (err) {
      logger.error(err);
    }
  }
};

// TODO: Controller for create new room
exports.createRoom = async (req, res) => {
  try {
    const {
      room_name, room_slug, room_type, room_price, room_size, room_capacity,
      allow_pets, provide_breakfast, featured_room, room_description, extra_facilities
    } = req.body;

    if (!room_name) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_name` filed is required'));
    }

    if (!room_slug) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_slug` filed is required'));
    }

    if (!room_type) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_type` filed is required'));
    }

    if (!room_price) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_price` filed is required'));
    }

    if (!room_size) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_size` filed is required'));
    }

    if (!room_capacity) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_capacity` filed is required'));
    }

    if (!room_description) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_description` filed is required'));
    }

    if (!extra_facilities[0]) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', 'Minimum 1 `extra_facilities` filed is required'));
    }

    if (!req.files[0]) {
      return res.status(400).json(errorResponse(1, 'FAILED', 'Minimum 1 `room_images` filed is required'));
    }

    const roomName = await Room.findOne({ room_name });
    if (roomName) {
      await deleteUploadedImages(req.files);
      return res.status(409).json(errorResponse(9, 'ALREADY EXIST', 'Sorry, `room_name` already exists'));
    }

    const roomSlug = await Room.findOne({ room_slug });
    if (roomSlug) {
      await deleteUploadedImages(req.files);
      return res.status(409).json(errorResponse(9, 'ALREADY EXIST', 'Sorry, `room_slug` already exists'));
    }

    const data = {
      room_name,
      room_slug,
      room_type,
      room_price,
      room_size,
      room_capacity,
      allow_pets,
      provide_breakfast,
      featured_room,
      room_description,
      extra_facilities,
      room_images: req.files.map((file) => ({
        url: file.path,         // Cloudinary secure URL
        public_id: file.filename // Cloudinary public_id
      })),
      created_by: req.user.id
    };

    const room = await Room.create(data);

    res.status(201).json(successResponse(0, 'SUCCESS', 'New room create successful', room));
  } catch (error) {
    await deleteUploadedImages(req.files);
    res.status(500).json(errorResponse(2, 'SERVER SIDE ERROR', error));
  }
};

// TODO: Controller for get all rooms list
exports.getRoomsList = async (req, res) => {
  try {
    const rooms = await Room.find();

    const roomQuery = new MyQueryHelper(Room.find(), req.query).search('room_name').sort().paginate();
    const findRooms = await roomQuery.query;

    const mappedRooms = findRooms?.map((data) => ({
      id: data._id,
      room_name: data.room_name,
      room_slug: data.room_slug,
      room_type: data.room_type,
      room_price: data.room_price,
      room_size: data.room_size,
      room_capacity: data.room_capacity,
      allow_pets: data.allow_pets,
      provide_breakfast: data.provide_breakfast,
      featured_room: data.featured_room,
      room_description: data.room_description,
      room_status: data.room_status,
      extra_facilities: data.extra_facilities,
      room_images: data.room_images.map((img) => ({ url: img.url, public_id: img.public_id })),
      created_by: data.created_by,
      created_at: data.createdAt,
      updated_at: data.updatedAt
    }));

    res.status(200).json(successResponse(0, 'SUCCESS', 'Rooms list data found successful', {
      rows: mappedRooms,
      total_rows: rooms.length,
      response_rows: findRooms.length,
      total_page: req?.query?.keyword
        ? Math.ceil(findRooms.length / req.query.limit)
        : Math.ceil(rooms.length / req.query.limit),
      current_page: req?.query?.page ? parseInt(req.query.page, 10) : 1
    }));
  } catch (error) {
    res.status(500).json(errorResponse(2, 'SERVER SIDE ERROR', error));
  }
};

// TODO: Controller for find a room by id or room slug_name
exports.getRoomByIdOrSlugName = async (req, res) => {
  try {
    let room = null;

    if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      room = await Room.findById(req.params.id).populate('created_by');
    } else {
      room = await Room.findOne({ room_slug: req.params.id }).populate('created_by');
    }

    if (!room) {
      return res.status(404).json(errorResponse(4, 'UNKNOWN ACCESS', 'Room does not exist'));
    }

    const organizedRoom = {
      id: room._id,
      room_name: room.room_name,
      room_slug: room.room_slug,
      room_type: room.room_type,
      room_price: room.room_price,
      room_size: room.room_size,
      room_capacity: room.room_capacity,
      allow_pets: room.allow_pets,
      provide_breakfast: room.provide_breakfast,
      featured_room: room.featured_room,
      room_description: room.room_description,
      room_status: room.room_status,
      extra_facilities: room.extra_facilities,
      room_images: room.room_images.map((img) => ({ url: img.url, public_id: img.public_id })),
      created_by: {
        id: room.created_by._id,
        userName: room.created_by.userName,
        fullName: room.created_by.fullName,
        email: room.created_by.email,
        phone: room.created_by.phone,
        avatar: process.env.APP_BASE_URL + room.created_by.avatar,
        gender: room.created_by.gender,
        dob: room.created_by.dob,
        address: room.created_by.address,
        role: room.created_by.role,
        verified: room.created_by.verified,
        status: room.created_by.status,
        createdAt: room.created_by.createdAt,
        updatedAt: room.created_by.updatedAt
      },
      created_at: room.createdAt,
      updated_at: room.updatedAt
    };

    res.status(200).json(successResponse(0, 'SUCCESS', 'User information get successful', organizedRoom));
  } catch (error) {
    res.status(500).json(errorResponse(2, 'SERVER SIDE ERROR', error));
  }
};

// TODO: Controller for edit room
exports.editRoomByAdmin = async (req, res) => {
  try {
    const {
      room_name, room_slug, room_type, room_price, room_size, room_capacity,
      allow_pets, provide_breakfast, featured_room, room_description, extra_facilities
    } = req.body;

    if (!room_name) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_name` filed is required'));
    }
    if (!room_slug) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_slug` filed is required'));
    }
    if (!room_type) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_type` filed is required'));
    }
    if (!room_price) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_price` filed is required'));
    }
    if (!room_size) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_size` filed is required'));
    }
    if (!room_capacity) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_capacity` filed is required'));
    }
    if (!room_description) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', '`room_description` filed is required'));
    }
    if (!extra_facilities[0]) {
      await deleteUploadedImages(req.files);
      return res.status(400).json(errorResponse(1, 'FAILED', 'Minimum 1 `extra_facilities` filed is required'));
    }
    if (!req.files[0]) {
      return res.status(400).json(errorResponse(1, 'FAILED', 'Minimum 1 `room_images` filed is required'));
    }

    let room = null;
    if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      room = await Room.findById(req.params.id);
    }

    if (!room) {
      await deleteUploadedImages(req.files);
      return res.status(404).json(errorResponse(4, 'UNKNOWN ACCESS', 'Room does not exist'));
    }

    // delete old images from Cloudinary
    for (const img of room.room_images) {
      if (img.public_id) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (err) {
          logger.error(err);
        }
      }
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      {
        room_name,
        room_slug,
        room_type,
        room_price,
        room_size,
        room_capacity,
        allow_pets,
        provide_breakfast,
        featured_room,
        room_description,
        extra_facilities,
        room_images: req.files.map((file) => ({
          url: file.path,
          public_id: file.filename
        })),
        updatedAt: Date.now()
      },
      { runValidators: true, new: true }
    );

    res.status(201).json(successResponse(0, 'SUCCESS', 'New room updated successful', updatedRoom));
  } catch (error) {
    await deleteUploadedImages(req.files);
    res.status(500).json(errorResponse(2, 'SERVER SIDE ERROR', error));
  }
};

// TODO: Controller for delete room using ID by admin
exports.deleteRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json(errorResponse(4, 'UNKNOWN ACCESS', 'Room does not exist'));
    }

    await Room.findByIdAndDelete(room.id);

    // delete images from Cloudinary
    for (const img of room.room_images) {
      if (img.public_id) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (err) {
          logger.error(err);
        }
      }
    }

    res.status(200).json(successResponse(0, 'SUCCESS', 'Room delete form database successful'));
  } catch (error) {
    res.status(500).json(errorResponse(2, 'SERVER SIDE ERROR', error));
  }
};

// TODO: Controller for get featured rooms list
exports.getFeaturedRoomsList = async (req, res) => {
  try {
    const rooms = await Room.find({ featured_room: true });

    const roomQuery = new MyQueryHelper(
      Room.find({ featured_room: true }), req.query
    ).search('room_name').sort().paginate();
    const findRooms = await roomQuery.query;

    const mappedRooms = findRooms?.map((data) => ({
      id: data._id,
      room_name: data.room_name,
      room_slug: data.room_slug,
      room_type: data.room_type,
      room_price: data.room_price,
      room_size: data.room_size,
      room_capacity: data.room_capacity,
      allow_pets: data.allow_pets,
      provide_breakfast: data.provide_breakfast,
      featured_room: data.featured_room,
      room_description: data.room_description,
      room_status: data.room_status,
      extra_facilities: data.extra_facilities,
      room_images: data.room_images.map((img) => ({ url: img.url, public_id: img.public_id })),
      created_by: data.created_by,
      created_at: data.createdAt,
      updated_at: data.updatedAt
    }));

    res.status(200).json(successResponse(0, 'SUCCESS', 'Featured rooms list data found successful', {
      rows: mappedRooms,
      total_rows: rooms.length,
      response_rows: findRooms.length,
      total_page: req?.query?.keyword
        ? Math.ceil(findRooms.length / req.query.limit)
        : Math.ceil(rooms.length / req.query.limit),
      current_page: req?.query?.page ? parseInt(req.query.page, 10) : 1
    }));
  } catch (error) {
    res.status(500).json(errorResponse(2, 'SERVER SIDE ERROR', error));
  }
};

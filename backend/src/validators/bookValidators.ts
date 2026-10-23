import { celebrate, Joi, Segments } from 'celebrate';

export const getBookByIdValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().trim().required().messages({
      'any.required': 'Book ID is required',
      'string.empty': 'Book ID cannot be empty',
    }),
  }),
});

export const getBooksQueryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    authorId: Joi.string().trim().optional(),
  }),
});

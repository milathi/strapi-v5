import type { Attribute, Common, Utils } from '../../../../types';

import type * as Operator from './operators';
import type * as AttributeUtils from '../attributes';
import type * as Params from '..';

export { Operator };

type IDKey = 'id';

/**
 * Generic object notation for filters.
 * @template TSchemaUID The type of the schema UID for the object notation.
 */
export type Any<TSchemaUID extends Common.UID.Schema> = ObjectNotation<TSchemaUID>;

/**
 * Type that unites root-level operators and attributes filtering for a specific schema query.
 *
 * It is used to define the structure of filters objects in a specific schema.
 * @template TSchemaUID The UID of the schema defining the object notation.
 */
export type ObjectNotation<TSchemaUID extends Common.UID.Schema> =
  RootLevelOperatorFiltering<TSchemaUID> & AttributesFiltering<TSchemaUID>;

/**
 * Object for root level operator filtering.
 * @template TSchemaUID - The type of the schema UID.
 */
export type RootLevelOperatorFiltering<TSchemaUID extends Common.UID.Schema> = {
  [TIter in Operator.Group]?: ObjectNotation<TSchemaUID>[];
} & {
  [TIter in Operator.Logical]?: ObjectNotation<TSchemaUID>;
};

/**
 * Represents a type for filtering on attributes based on a given schema.
 *  @template TSchemaUID - The UID of the schema.
 */
export type AttributesFiltering<TSchemaUID extends Common.UID.Schema> = Utils.Guard.Never<
  // Combines filtering for scalar and nested attributes based on schema UID
  ScalarAttributesFiltering<TSchemaUID> & NestedAttributeFiltering<TSchemaUID>,
  // Abstract representation of the filter object tree in case we don't have access to the attributes' list
  {
    [TKey in string]?:
      | AttributeCondition<TSchemaUID, never>
      | NestedAttributeCondition<TSchemaUID, never>;
  }
>;

/**
 * Definition of scalar attribute filtering for a given schema UID.
 * @template TSchemaUID - The UID of the schema.
 */
export type ScalarAttributesFiltering<TSchemaUID extends Common.UID.Schema> =
  AttributeUtils.GetScalarKeys<TSchemaUID> extends infer TKeys
    ? TKeys extends AttributeUtils.GetScalarKeys<TSchemaUID>
      ? IDFiltering & { [TKey in TKeys]?: AttributeCondition<TSchemaUID, TKey> }
      : never
    : never;

/**
 * Filters object for nested schema attributes.
 * @template TSchemaUID - The UID of the schema to perform filtering on.
 */
export type NestedAttributeFiltering<TSchemaUID extends Common.UID.Schema> =
  AttributeUtils.GetNestedKeys<TSchemaUID> extends infer TKeys
    ? TKeys extends AttributeUtils.GetNestedKeys<TSchemaUID>
      ? { [TKey in TKeys]?: ObjectNotation<Attribute.GetTarget<TSchemaUID, TKey>> }
      : never
    : never;

type IDFiltering = { id?: AttributeCondition<never, IDKey> };

/**
 * Filter condition for scalar attributes.
 * @template TSchemaUID - The unique identifier of the schema.
 * @template TAttributeName - The name of the attribute.
 */
type AttributeCondition<
  TSchemaUID extends Common.UID.Schema,
  TAttributeName extends IDKey | AttributeUtils.GetScalarKeys<TSchemaUID>
> = GetScalarAttributeValue<TSchemaUID, TAttributeName> extends infer TAttributeValue
  ?
      | TAttributeValue // Implicit $eq operator
      | ({
          [TIter in Operator.BooleanValue]?: boolean;
        } & {
          [TIter in Operator.DynamicValue]?: TAttributeValue;
        } & {
          [TIter in Operator.DynamicArrayValue]?: TAttributeValue[];
        } & {
          [TIter in Operator.DynamicBoundValue]?: [TAttributeValue, TAttributeValue];
        } & {
          [TIter in Operator.Logical]?: AttributeCondition<TSchemaUID, TAttributeName>;
        } & {
          [TIter in Operator.Group]?: AttributeCondition<TSchemaUID, TAttributeName>[];
        })
  : never;

/**
 * Utility type that retrieves the value of a scalar attribute in a schema.
 * @template TSchemaUID The UID type of the schema.
 * @template TAttributeName The name of the attribute.
 */
type GetScalarAttributeValue<
  TSchemaUID extends Common.UID.Schema,
  TAttributeName extends IDKey | AttributeUtils.GetScalarKeys<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    // Checks and captures for manually added ID attributes
    [Utils.Expression.StrictEqual<TAttributeName, IDKey>, Params.Attribute.ID],
    [
      // Ensure attribute name isn't 'never'
      Utils.Expression.IsNotNever<TAttributeName>,
      // Get value of specific attribute in the schema
      AttributeUtils.GetValue<
        Attribute.Get<
          TSchemaUID,
          // Cast attribute name to a scalar key if possible
          Utils.Cast<TAttributeName, AttributeUtils.GetScalarKeys<TSchemaUID>>
        >
      >
    ]
  ],
  // Fallback to the list of all possible scalar attributes' value if the attribute is not valid (never)
  AttributeUtils.ScalarValues
>;

/**
 * Nested filter condition based on the given schema and attribute name
 * @template TSchemaUID - The (literal) UID of the schema.
 * @template TAttributeName - The attribute name in the schema.
 */
type NestedAttributeCondition<
  TSchemaUID extends Common.UID.Schema,
  TAttributeName extends Attribute.GetKeys<TSchemaUID>
> = ObjectNotation<
  // Ensure the resolved target isn't `never`, else, fallback to Common.UID.Schema
  Utils.Guard.Never<Attribute.GetTarget<TSchemaUID, TAttributeName>, Common.UID.Schema>
>;

'use strict';

export enum CommandResponse {
	
	SUCCESS 						= 0X01,
	FAILED 						= 0X00,
	
//	INITIALIZED 					= 0X01,
//	NOT_INITIALIZED 				= 0X00,
//
//	// by wan ------ 区分F,G
////	MODE_ADMIN 			= 0X00,
////	MODE_UNLOCK	 		= 0X01,
//
//	ADMIN 							= 0X01,		//管理员
//	USER 							= 0X00,		//普通用户
//
//	SUCCESS_GET_DYN_PASSWORD 		= 0X02,
//	ERROR_NONE 					= 0X00,
//	ERROR_INVALID_CRC 				= 0X01,
//	ERROR_NO_PERMISSION 			= 0X02,
//	ERROR_WRONG_ID_OR_PASSWORD 	= 0X03,
//	ERROR_REACH_LIMIT	 			= 0X04,
//	ERROR_IN_SETTING	 			= 0X05,
//	//	------by wan------
//	ERROR_IN_SAME_USERID	 		= 0X06,		//	不能添加重名的
//	ERROR_NO_ADMIN_YET				= 0X07,		//	必须先添加一个管理员
//
//	ERROR_Dyna_Password_Out_Time	= 0X08,		//	动态密码过期
//	ERROR_NO_DATA					= 0X09,		//	数据为空
//
//	ERROR_LOCK_NO_POWER			= 0X0a,		//	锁没有电量了
//
//	public byte command,
//	public byte isSuccess,
//	public byte errorCode,
}